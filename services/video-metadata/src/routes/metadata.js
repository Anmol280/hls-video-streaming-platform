const express = require('express');
const metadataController = require('../controllers/metadataController');
const { authMiddleware, requireRole, serviceAuth } = require('../middleware/auth');
const { validateMetadata, validateSearch } = require('../middleware/validation');
const { apiLimiter, searchLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes (no auth required)
router.get('/video/:videoId/public', 
  apiLimiter,
  metadataController.getPublicMetadata
);

router.get('/search/public',
  searchLimiter,
  validateSearch,
  metadataController.searchPublicVideos
);

// Protected routes (auth required)
router.get('/video/:videoId',
  authMiddleware,
  apiLimiter,
  metadataController.getVideoMetadata
);

router.put('/video/:videoId',
  authMiddleware,
  requireRole(['user', 'creator', 'admin']),
  validateMetadata,
  metadataController.updateVideoMetadata
);

router.delete('/video/:videoId',
  authMiddleware,
  requireRole(['user', 'creator', 'admin']),
  metadataController.deleteVideoMetadata
);

router.get('/user/:userId/videos',
  authMiddleware,
  apiLimiter,
  metadataController.getUserVideos
);

router.get('/search',
  authMiddleware,
  searchLimiter,
  validateSearch,
  metadataController.searchVideos
);

router.get('/trending',
  apiLimiter,
  metadataController.getTrendingVideos
);

router.get('/recommendations/:userId',
  authMiddleware,
  apiLimiter,
  metadataController.getRecommendations
);

router.get('/analytics/:videoId',
  authMiddleware,
  requireRole(['creator', 'admin']),
  metadataController.getVideoAnalytics
);

// Service-to-service routes (internal API)
router.post('/internal/video',
  serviceAuth,
  validateMetadata,
  metadataController.createVideoMetadata
);

router.put('/internal/video/:videoId/status',
  serviceAuth,
  metadataController.updateVideoStatus
);

router.post('/internal/video/:videoId/view',
  serviceAuth,
  metadataController.recordView
);

router.post('/internal/video/:videoId/engagement',
  serviceAuth,
  metadataController.recordEngagement
);

module.exports = router;
