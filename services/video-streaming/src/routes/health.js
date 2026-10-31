const express = require('express');
const videoService = require('../services/videoService');
const storageService = require('../services/storageService');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({
    status: 'healthy',
    service: 'video-streaming',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

router.get('/ready', async (req, res) => {
  try {
    await videoService.checkConnection();
    await storageService.checkConnection();
    return res.json({
      status: 'ready',
      service: 'video-streaming',
      checks: { database: 'connected', storage: 'connected' }
    });
  } catch (error) {
    logger.error('Streaming readiness check failed', { message: error.message });
    return res.status(503).json({
      status: 'not ready',
      service: 'video-streaming',
      error: 'A required dependency is unavailable'
    });
  }
});

module.exports = router;
