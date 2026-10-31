const express = require('express');
const redis = require('redis');
const videoService = require('../services/videoService');
const logger = require('../utils/logger');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'video-upload',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

router.get('/ready', async (req, res) => {
  let client;
  try {
    await videoService.checkConnection();
    if (process.env.REDIS_URL) {
      client = redis.createClient({ url: process.env.REDIS_URL });
    } else {
      client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379
        },
        password: process.env.REDIS_PASSWORD || undefined
      });
    }
    await client.connect();
    await client.ping();
    await client.quit();
    return res.json({
      status: 'ready',
      service: 'video-upload',
      checks: { database: 'connected', redis: 'connected' }
    });
  } catch (error) {
    if (client && client.isOpen) await client.quit().catch(() => {});
    logger.error('Upload readiness check failed', { message: error.message });
    return res.status(503).json({
      status: 'not ready',
      service: 'video-upload',
      error: 'A required dependency is unavailable'
    });
  }
});

module.exports = router;
