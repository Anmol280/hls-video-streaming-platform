const { pipeline } = require('stream/promises');
const defaultVideoService = require('../services/videoService');
const defaultStorageService = require('../services/storageService');
const {
  masterKey,
  variantKey,
  segmentKey,
  validatePlaylist
} = require('../utils/hlsPlaylist');

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

class StreamingController {
  constructor(services = {}) {
    this.videoService = services.videoService || defaultVideoService;
    this.storageService = services.storageService || defaultStorageService;
  }

  async authorize(videoId, user) {
    const video = await this.videoService.getVideoForStreaming(videoId);
    if (!video || video.status !== 'ready') throw httpError(404, 'Video not found');
    if (video.visibility === 'private' &&
        video.userId !== user?.id &&
        !user?.roles?.includes('admin')) {
      throw httpError(403, 'Access denied');
    }
    if (!['public', 'private', 'unlisted'].includes(video.visibility)) {
      throw httpError(404, 'Video not found');
    }
    return video;
  }

  async sendPlaylist(req, res, key, kind) {
    await this.authorize(req.params.videoId, req.user);
    if (!await this.storageService.exists(key)) throw httpError(404, 'HLS playlist not found');
    const playlist = validatePlaylist(await this.storageService.readText(key), kind);
    res.status(200).set({
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'private, max-age=30',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Authorization'
    });
    return res.send(playlist);
  }

  async getHLSPlaylist(req, res) {
    const key = masterKey(req.params.videoId);
    return this.sendPlaylist(req, res, key, 'master');
  }

  async getQualityPlaylist(req, res) {
    const key = variantKey(req.params.videoId, req.params.quality);
    return this.sendPlaylist(req, res, key, 'variant');
  }

  async getHLSSegment(req, res) {
    const key = segmentKey(
      req.params.videoId,
      req.params.quality,
      req.params.segmentName
    );
    await this.authorize(req.params.videoId, req.user);
    if (!await this.storageService.exists(key)) throw httpError(404, 'HLS segment not found');

    res.status(200).set({
      'Content-Type': 'video/mp2t',
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Authorization'
    });
    try {
      await pipeline(await this.storageService.createReadStream(key), res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      throw error;
    }
  }
}

const controller = new StreamingController();
controller.StreamingController = StreamingController;
module.exports = controller;
