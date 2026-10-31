const express = require('express');
const uploadController = require('../controllers/uploadController');
const { authMiddleware, requireRole, validateOwnership } = require('../middleware/auth');
const { 
  uploadVideo, 
  uploadThumbnail, 
  uploadMultiple, 
  validateFileUpload, 
  validateVideoMetadata,
  cleanupUploadedFiles,
  handleMulterError 
} = require('../middleware/upload');
const { 
  uploadLimiter, 
  bulkUploadLimiter, 
  thumbnailLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Video upload endpoint
router.post('/video',
  authMiddleware,
  requireRole(['user', 'creator', 'admin']),
  uploadLimiter,
  uploadVideo,
  handleMulterError,
  cleanupUploadedFiles,
  validateFileUpload,
  validateVideoMetadata,
  uploadController.uploadVideo
);

// Thumbnail upload endpoint
router.post('/thumbnail',
  authMiddleware,
  requireRole(['user', 'creator', 'admin']),
  thumbnailLimiter,
  uploadThumbnail,
  handleMulterError,
  cleanupUploadedFiles,
  validateFileUpload,
  uploadController.uploadThumbnail
);

// Bulk video upload endpoint
router.post('/bulk',
  authMiddleware,
  requireRole(['creator', 'admin']),
  bulkUploadLimiter,
  uploadMultiple,
  handleMulterError,
  cleanupUploadedFiles,
  validateFileUpload,
  uploadController.bulkUpload
);

// Get upload progress
router.get('/progress/:uploadId',
  authMiddleware,
  validateOwnership,
  uploadController.getUploadProgress
);

// Cancel upload
router.delete('/cancel/:uploadId',
  authMiddleware,
  validateOwnership,
  uploadController.cancelUpload
);

module.exports = router;
