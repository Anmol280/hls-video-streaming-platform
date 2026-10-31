const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { validateAnalytics } = require('../middleware/validation');
const { analyticsLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// View tracking (public endpoint for video analytics)
router.post('/view/:videoId',
  optionalAuth,
  analyticsLimiter,
  validateAnalytics.view,
  analyticsController.recordView
);

// Engagement tracking
router.post('/engagement/:videoId',
  optionalAuth,
  analyticsLimiter,
  validateAnalytics.engagement,
  analyticsController.recordEngagement
);

// Quality metrics
router.post('/quality/:videoId',
  optionalAuth,
  analyticsLimiter,
  validateAnalytics.quality,
  analyticsController.recordQualityMetrics
);

// Buffer events
router.post('/buffer/:videoId',
  optionalAuth,
  analyticsLimiter,
  validateAnalytics.buffer,
  analyticsController.recordBufferEvent
);

// Playback events
router.post('/playback/:videoId',
  optionalAuth,
  analyticsLimiter,
  validateAnalytics.playback,
  analyticsController.recordPlaybackEvent
);

// Get video analytics (protected)
router.get('/video/:videoId',
  authMiddleware,
  analyticsController.getVideoAnalytics
);

// Get user watch history
router.get('/history/:userId',
  authMiddleware,
  analyticsController.getUserWatchHistory
);

// Get trending videos
router.get('/trending',
  optionalAuth,
  analyticsController.getTrendingVideos
);

// Get real-time metrics
router.get('/realtime/:videoId',
  authMiddleware,
  analyticsController.getRealtimeMetrics
);

module.exports = router;
