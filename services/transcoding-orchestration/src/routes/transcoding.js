const express = require('express');
const transcodingController = require('../controllers/transcodingController');
const { authMiddleware, requireRole, serviceAuth } = require('../middleware/auth');
const { validateTranscoding } = require('../middleware/validation');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public job status endpoints
router.get('/job/:jobId/status',
  apiLimiter,
  transcodingController.getJobStatus
);

// Protected endpoints
router.get('/jobs',
  authMiddleware,
  requireRole(['creator', 'admin']),
  apiLimiter,
  transcodingController.getUserJobs
);

router.get('/job/:jobId',
  authMiddleware,
  apiLimiter,
  transcodingController.getJobDetails
);

router.post('/job/:jobId/cancel',
  authMiddleware,
  requireRole(['creator', 'admin']),
  transcodingController.cancelJob
);

router.post('/job/:jobId/restart',
  authMiddleware,
  requireRole(['creator', 'admin']),
  transcodingController.restartJob
);

router.get('/statistics',
  authMiddleware,
  requireRole(['admin']),
  transcodingController.getStatistics
);

// Service-to-service endpoints
router.post('/internal/transcode',
  serviceAuth,
  validateTranscoding,
  transcodingController.createTranscodingJob
);

router.post('/internal/job/:jobId/update',
  serviceAuth,
  transcodingController.updateJobStatus
);

router.get('/internal/queue/status',
  serviceAuth,
  transcodingController.getQueueStatus
);

router.post('/internal/queue/priority/:jobId',
  serviceAuth,
  transcodingController.updateJobPriority
);

module.exports = router;
