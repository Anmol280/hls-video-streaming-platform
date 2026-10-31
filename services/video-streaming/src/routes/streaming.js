const express = require('express');
const controller = require('../controllers/streamingController');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res)).catch(next);
  };
}

router.get(
  '/hls/:videoId/playlist.m3u8',
  optionalAuth,
  asyncHandler((req, res) => controller.getHLSPlaylist(req, res))
);

router.get(
  '/hls/:videoId/:quality/playlist.m3u8',
  optionalAuth,
  asyncHandler((req, res) => controller.getQualityPlaylist(req, res))
);

router.get(
  '/hls/:videoId/:quality/:segmentName',
  optionalAuth,
  asyncHandler((req, res) => controller.getHLSSegment(req, res))
);

module.exports = router;
