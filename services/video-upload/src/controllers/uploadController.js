const Bull = require('bull');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const sharp = require('sharp');
const { QUEUE_NAME, buildTranscodingJob } = require('../utils/transcodingJob');
const logger = require('../utils/logger');
const storageService = require('../services/s3Service');
const videoService = require('../services/videoService');

ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || 'ffprobe');

const queueOptions = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }
    };
const transcodingQueue = new Bull(QUEUE_NAME, queueOptions);

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function respondError(res, error, context) {
  logger.error(context, { message: error.message, stack: error.stack });
  if (res.headersSent) return;
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status >= 500 ? 'Request could not be completed' : error.message;
  return res.status(status).json({ error: message });
}

function tagsFromRequest(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(tag => String(tag).trim()).filter(Boolean);
  return String(tags).split(',').map(tag => tag.trim()).filter(Boolean);
}

async function detectedType(filePath) {
  const fileTypeModule = await import('file-type');
  return fileTypeModule.fileTypeFromFile(filePath);
}

class UploadController {
  async processVideoFile(file, userId, options = {}) {
    if (!file || !file.path) throw httpError(400, 'No video file provided');
    const detected = await detectedType(file.path);
    if (!detected || !detected.mime.startsWith('video/')) {
      throw httpError(400, 'Invalid video file format');
    }

    const metadata = await this.getVideoMetadata(file.path);
    if (!Number.isFinite(metadata.duration) || metadata.duration <= 0) {
      throw httpError(400, 'Video duration could not be read');
    }

    const videoId = require('crypto').randomUUID();
    const filename = path.basename(file.originalname || 'video');
    const extension = path.extname(filename).toLowerCase();
    const s3Key = 'videos/originals/' + videoId + extension;
    const title = options.title || filename.replace(/\.[^/.]+$/, '');
    const visibility = options.visibility || 'private';
    const uploadResult = await storageService.uploadFile({
      key: s3Key,
      filePath: file.path,
      contentType: detected.mime,
      metadata: {
        userId,
        videoId,
        originalName: filename
      }
    });

    let videoCreated = false;
    let jobCreated = false;
    try {
      await videoService.createVideo({
        id: videoId,
        userId,
        title,
        description: options.description || '',
        originalFilename: filename.slice(0, 255),
        s3Key,
        s3Url: uploadResult.Location || s3Key,
        fileSize: file.size,
        duration: Math.max(1, Math.round(metadata.duration)),
        width: metadata.width,
        height: metadata.height,
        visibility,
        tags: tagsFromRequest(options.tags),
        status: 'uploaded'
      });
      videoCreated = true;

      const queueJob = buildTranscodingJob({
        videoId,
        userId,
        inputPath: s3Key,
        metadata
      });
      await videoService.createTranscodingJob(videoId, queueJob.data);
      jobCreated = true;
      await videoService.updateVideo(videoId, { status: 'processing' });
      await transcodingQueue.add(queueJob.name, queueJob.data, queueJob.options);

      return { id: videoId, title, status: 'processing' };
    } catch (error) {
      if (!videoCreated) {
        await storageService.deleteFile(s3Key).catch(cleanupError =>
          logger.error('Could not remove untracked original upload', { s3Key, message: cleanupError.message })
        );
      } else {
        await videoService.updateVideo(videoId, { status: 'failed' }).catch(() => {});
        if (jobCreated) {
          await videoService.updateTranscodingJob(videoId, {
            status: 'failed',
            errorMessage: 'Could not enqueue video for transcoding'
          }).catch(() => {});
        }
      }
      throw error;
    }
  }

  async uploadVideo(req, res) {
    try {
      const video = await this.processVideoFile(req.file, req.user.id, req.body);
      return res.status(201).json({
        message: 'Video uploaded and queued for processing',
        video: Object.assign(video, { uploadedAt: new Date().toISOString() })
      });
    } catch (error) {
      return respondError(res, error, 'Video upload failed');
    }
  }

  async uploadThumbnail(req, res) {
    try {
      const file = req.file;
      const videoId = req.body.videoId;
      if (!file) throw httpError(400, 'No thumbnail file provided');
      const video = await videoService.getVideoById(videoId);
      if (!video || (video.userId !== req.user.id && req.user.role !== 'admin')) {
        throw httpError(404, 'Video not found');
      }
      const detected = await detectedType(file.path);
      if (!detected || !detected.mime.startsWith('image/')) {
        throw httpError(400, 'Invalid image file format');
      }

      const processedImage = await sharp(file.path)
        .resize(1280, 720, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toBuffer();
      const key = 'videos/thumbnails/' + videoId + '.jpg';
      const uploadResult = await storageService.uploadFile({
        key,
        buffer: processedImage,
        contentType: 'image/jpeg',
        metadata: { videoId, userId: req.user.id, type: 'thumbnail' }
      });
      await videoService.updateVideo(videoId, { thumbnailUrl: uploadResult.Location || key });
      return res.json({
        message: 'Thumbnail uploaded successfully',
        thumbnailUrl: uploadResult.Location || key
      });
    } catch (error) {
      return respondError(res, error, 'Thumbnail upload failed');
    }
  }

  async bulkUpload(req, res) {
    if (!Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploads = [];
    for (const file of req.files) {
      try {
        const filename = path.basename(file.originalname || 'video');
        const video = await this.processVideoFile(file, req.user.id, {
          title: filename.replace(/\.[^/.]+$/, ''),
          visibility: req.body.visibility || 'private'
        });
        uploads.push({ videoId: video.id, title: video.title, status: 'success' });
      } catch (error) {
        uploads.push({
          filename: path.basename(file.originalname || 'video'),
          status: 'error',
          error: Number.isInteger(error.status) && error.status < 500
            ? error.message
            : 'Could not process this video'
        });
      }
    }
    return res.status(200).json({ message: 'Bulk upload completed', uploads });
  }

  async getUploadProgress(req, res) {
    try {
      const uploadId = req.params.uploadId;
      const video = await videoService.getVideoById(uploadId);
      if (!video || (video.userId !== req.user.id && req.user.role !== 'admin')) {
        return res.status(404).json({ error: 'Upload not found' });
      }

      const job = await transcodingQueue.getJob(uploadId);
      const databaseJob = await videoService.getTranscodingJob(uploadId);
      if (!job) {
        return res.json({
          status: databaseJob ? databaseJob.status : video.status,
          progress: databaseJob ? databaseJob.progressPercentage : 0,
          stage: 'transcoding'
        });
      }
      const state = await job.getState();
      const progress = typeof job.progress === 'function' ? await job.progress() : job.progress;
      return res.json({
        status: state,
        progress: Number(progress) || 0,
        stage: job.data.stage || 'transcoding',
        completedOn: job.finishedOn || null,
        failedReason: job.failedReason || null
      });
    } catch (error) {
      return respondError(res, error, 'Could not read upload progress');
    }
  }

  async cancelUpload(req, res) {
    try {
      const uploadId = req.params.uploadId;
      const video = await videoService.getVideoById(uploadId);
      if (!video || (video.userId !== req.user.id && req.user.role !== 'admin')) {
        return res.status(404).json({ error: 'Upload not found' });
      }
      const job = await transcodingQueue.getJob(uploadId);
      if (job) {
        const state = await job.getState();
        if (!['waiting', 'delayed', 'paused'].includes(state)) {
          return res.status(409).json({ error: 'Transcoding has started and cannot be cancelled here' });
        }
        await job.remove();
      }
      if (video.s3Key) await storageService.deleteFile(video.s3Key);
      await videoService.deleteVideo(uploadId);
      return res.json({ message: 'Queued upload cancelled' });
    } catch (error) {
      return respondError(res, error, 'Could not cancel upload');
    }
  }

  getVideoMetadata(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) return reject(error);
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) return reject(httpError(400, 'Uploaded file contains no video stream'));
        const duration = Number(metadata.format.duration);
        return resolve({
          duration: Number.isFinite(duration) ? duration : 0,
          width: Number(videoStream.width) || 0,
          height: Number(videoStream.height) || 0,
          bitrate: Number(metadata.format.bit_rate) || 0,
          format: metadata.format.format_name || null,
          codec: videoStream.codec_name || null
        });
      });
    });
  }

  async close() {
    await transcodingQueue.close();
  }
}

module.exports = new UploadController();
