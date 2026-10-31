require('dotenv').config();

const Queue = require('bull');
const {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { pipeline } = require('stream/promises');
const { spawnSync } = require('child_process');
const { Pool } = require('pg');
const logger = require('./utils/logger');
const { makeMasterPlaylist } = require('./utils/masterPlaylist');

const queueName = 'transcoding';
const jobName = 'transcode-video';
const videoIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const storageDriver = process.env.STORAGE_DRIVER || 's3';
const storageRoot = path.resolve(process.env.STORAGE_ROOT || path.join(process.cwd(), 'storage'));
const bucketName = process.env.S3_BUCKET_NAME || process.env.S3_BUCKET;
const s3 = storageDriver === 'local' ? null : new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true'
});
const pool = new Pool(process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'hls_platform',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || undefined
    });

const redisOptions = process.env.REDIS_URL
  ? process.env.REDIS_URL
  : {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      }
    };
const transcodingQueue = new Queue(queueName, redisOptions);

const profiles = [
  { name: '1080p', width: 1920, height: 1080, bitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', width: 1280, height: 720, bitrate: '2500k', audioBitrate: '128k' },
  { name: '480p', width: 854, height: 480, bitrate: '1000k', audioBitrate: '96k' },
  { name: '360p', width: 640, height: 360, bitrate: '500k', audioBitrate: '64k' },
  { name: '240p', width: 426, height: 240, bitrate: '300k', audioBitrate: '48k' },
  { name: '144p', width: 256, height: 144, bitrate: '180k', audioBitrate: '32k' }
];

const workerId = 'worker-' + process.pid;

function localPath(key) {
  const resolved = path.resolve(storageRoot, ...key.split('/'));
  if (resolved !== storageRoot && !resolved.startsWith(storageRoot + path.sep)) {
    throw new Error('Invalid storage key');
  }
  return resolved;
}

function assertToolchain() {
  for (const binary of ['ffmpeg', 'ffprobe']) {
    const result = spawnSync(binary, ['-version'], { stdio: 'ignore', timeout: 5000 });
    if (result.error || result.status !== 0) {
      throw new Error(binary + ' is required on PATH');
    }
  }
}

async function downloadSource(key, destination) {
  if (storageDriver === 'local') {
    await fs.copyFile(localPath(key), destination);
    return;
  }
  if (!bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
  const result = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
  if (!result.Body) throw new Error('S3 returned an empty video object');
  await pipeline(result.Body, fs.createWriteStream(destination));
}

function contentTypeFor(key) {
  const extension = path.extname(key).toLowerCase();
  const types = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4'
  };
  return types[extension] || 'application/octet-stream';
}

async function publishFile(sourcePath, key) {
  if (storageDriver === 'local') {
    const destination = localPath(key);
    await fs.ensureDir(path.dirname(destination));
    await fs.copyFile(sourcePath, destination);
    return;
  }
  if (!bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
  await new Upload({
    client: s3,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: fs.createReadStream(sourcePath),
      ContentType: contentTypeFor(key),
      CacheControl: key.endsWith('.m3u8')
        ? 'private, max-age=30'
        : 'private, max-age=31536000, immutable',
      ServerSideEncryption: 'AES256'
    }
  }).done();
}

async function clearPublishedOutput(prefix) {
  if (storageDriver === 'local') {
    await fs.remove(localPath(prefix));
    return;
  }
  if (!bucketName) throw new Error('S3_BUCKET_NAME is required when STORAGE_DRIVER=s3');
  let continuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix + '/',
      ContinuationToken: continuationToken
    }));
    if (page.Contents && page.Contents.length) {
      const deleted = await s3.send(new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: { Objects: page.Contents.map(item => ({ Key: item.Key })) }
      }));
      if (deleted.Errors && deleted.Errors.length) {
        throw new Error('Could not remove previous HLS output before retry');
      }
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
}

function getVideoMetadata(inputFile) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputFile, (error, metadata) => {
      if (error) return reject(error);
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) return reject(new Error('Input contains no video stream'));
      const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
      return resolve({
        duration: Number(metadata.format.duration) || 0,
        width: Number(videoStream.width) || 0,
        height: Number(videoStream.height) || 0,
        bitrate: Number(metadata.format.bit_rate) || 0,
        hasAudio: Boolean(audioStream)
      });
    });
  });
}

function transcodeToHLS(inputFile, profile, outputDirectory, hasAudio) {
  return new Promise((resolve, reject) => {
    const playlistPath = path.join(outputDirectory, 'playlist.m3u8');
    const segmentPattern = path.join(outputDirectory, 'segment_%03d.ts');
    const filter = 'scale=' + profile.width + ':' + profile.height +
      ':force_original_aspect_ratio=decrease:force_divisible_by=2';
    const outputOptions = [
      '-vf', filter,
      '-hls_time', '6',
      '-hls_list_size', '0',
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', segmentPattern,
      '-f', 'hls'
    ];
    let command = ffmpeg(inputFile)
      .videoCodec('libx264')
      .videoBitrate(profile.bitrate)
      .outputOptions(outputOptions);
    if (hasAudio) {
      command = command.audioCodec('aac').audioBitrate(profile.audioBitrate);
    } else {
      command = command.noAudio();
    }
    command
      .output(playlistPath)
      .on('error', reject)
      .on('end', async () => {
        try {
          const names = await fs.readdir(outputDirectory);
          const segmentFiles = names
            .filter(name => /^segment_[0-9]+\.ts$/.test(name))
            .sort()
            .map(name => path.join(outputDirectory, name));
          if (!segmentFiles.length) throw new Error('FFmpeg produced no HLS segments');
          resolve({ playlistPath, segmentFiles });
        } catch (error) {
          reject(error);
        }
      })
      .run();
  });
}

async function saveTranscodeInfo(videoId, variant, hlsOutput) {
  const bitrate = Number.parseInt(variant.profile.bitrate, 10);
  const totalSize = (await Promise.all(hlsOutput.segmentFiles.map(file => fs.stat(file))))
    .reduce((total, stat) => total + stat.size, 0);
  await pool.query(
    'INSERT INTO video_transcodes ' +
    '(video_id, resolution, bitrate, codec, hls_playlist_path, total_segments, status, file_size) ' +
    "VALUES ($1, $2, $3, 'h264', $4, $5, 'completed', $6)",
    [
      videoId,
      variant.profile.name,
      bitrate,
      'transcoded/' + videoId + '/' + variant.profile.name + '/playlist.m3u8',
      hlsOutput.segmentFiles.length,
      totalSize
    ]
  );
}

async function updateJobStatus(videoId, status, progress, errorMessage) {
  const completedAt = ['completed', 'failed', 'cancelled'].includes(status);
  await pool.query(
    'UPDATE transcoding_jobs SET status = $1, worker_id = $2, ' +
    'progress_percentage = COALESCE($3, progress_percentage), error_message = $4, ' +
    'started_at = CASE WHEN $1 = $5 THEN COALESCE(started_at, NOW()) ELSE started_at END, ' +
    'completed_at = CASE WHEN $6 THEN NOW() ELSE completed_at END, updated_at = NOW() ' +
    'WHERE id = $7',
    [status, workerId, progress, errorMessage || null, 'processing', completedAt, videoId]
  );
}

async function updateVideoStatus(videoId, status) {
  await pool.query('UPDATE videos SET status = $1, updated_at = NOW() WHERE id = $2', [status, videoId]);
}

async function processVideo(job) {
  const data = job.data || {};
  const videoId = data.videoId;
  if (!videoIdPattern.test(videoId || '') || !data.inputPath || !data.outputBasePath) {
    throw new Error('Job is missing videoId, inputPath, or outputBasePath');
  }
  if (data.outputBasePath !== 'transcoded/' + videoId ||
      !data.inputPath.startsWith('videos/originals/') ||
      data.inputPath.includes('..')) {
    throw new Error('Job contains an invalid storage path');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hls-transcode-' + videoId + '-'));
  try {
    await updateVideoStatus(videoId, 'processing');
    await updateJobStatus(videoId, 'processing', 0, null);
    await clearPublishedOutput(data.outputBasePath);
    await pool.query('DELETE FROM video_transcodes WHERE video_id = $1', [videoId]);

    const inputFile = path.join(tempDir, 'input');
    await downloadSource(data.inputPath, inputFile);
    const metadata = await getVideoMetadata(inputFile);
    if (!metadata.width || !metadata.height) throw new Error('Could not read input dimensions');

    const candidates = profiles.filter(profile =>
      metadata.width >= profile.width && metadata.height >= profile.height
    );
    if (!candidates.length) {
      throw new Error('Input video is below the minimum supported resolution of 256x144');
    }

    const variants = [];
    for (let index = 0; index < candidates.length; index += 1) {
      const profile = candidates[index];
      const outputDirectory = path.join(tempDir, profile.name);
      await fs.ensureDir(outputDirectory);
      const hlsOutput = await transcodeToHLS(inputFile, profile, outputDirectory, metadata.hasAudio);
      const firstSegmentMetadata = await getVideoMetadata(hlsOutput.segmentFiles[0]);
      const variant = {
        profile,
        width: firstSegmentMetadata.width,
        height: firstSegmentMetadata.height
      };
      await publishFile(hlsOutput.playlistPath,
        data.outputBasePath + '/' + profile.name + '/playlist.m3u8');
      for (let offset = 0; offset < hlsOutput.segmentFiles.length; offset += 4) {
        const batch = hlsOutput.segmentFiles.slice(offset, offset + 4);
        await Promise.all(batch.map(file => publishFile(
          file,
          data.outputBasePath + '/' + profile.name + '/' + path.basename(file)
        )));
      }
      await saveTranscodeInfo(videoId, variant, hlsOutput);
      variants.push(variant);

      const progress = Math.round(((index + 1) / candidates.length) * 95);
      await job.progress(progress);
      await updateJobStatus(videoId, 'processing', progress, null);
    }

    const masterPath = path.join(tempDir, 'master.m3u8');
    await fs.writeFile(masterPath, makeMasterPlaylist(variants), 'utf8');
    await publishFile(masterPath, data.outputBasePath + '/master.m3u8');
    await updateVideoStatus(videoId, 'ready');
    await updateJobStatus(videoId, 'completed', 100, null);
    await job.progress(100);

    logger.info('HLS transcoding completed', { videoId, variants: variants.length });
    return { success: true, videoId, profilesProcessed: variants.length };
  } catch (error) {
    logger.error('HLS transcoding failed', { videoId, message: error.message, stack: error.stack });
    await updateVideoStatus(videoId, 'failed').catch(updateError =>
      logger.error('Could not mark video failed', { videoId, message: updateError.message })
    );
    await updateJobStatus(videoId, 'failed', null, error.message).catch(updateError =>
      logger.error('Could not mark transcoding job failed', { videoId, message: updateError.message })
    );
    throw error;
  } finally {
    await fs.remove(tempDir).catch(error =>
      logger.warn('Could not remove temporary transcoding files', { tempDir, message: error.message })
    );
  }
}

try {
  assertToolchain();
} catch (error) {
  logger.error('Worker startup check failed', { message: error.message });
  process.exit(1);
}

transcodingQueue.process(jobName, 3, processVideo);
transcodingQueue.on('failed', (job, error) => {
  logger.error('Bull job failed', {
    jobId: job && job.id,
    attemptsMade: job && job.attemptsMade,
    message: error.message
  });
});

logger.info('Transcoding worker ready', { workerId, queueName, storageDriver });

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Transcoding worker shutting down', { signal });
  await transcodingQueue.close();
  await pool.end();
  process.exit(0);
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

module.exports = transcodingQueue;
