const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'video-metadata',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

router.get('/ready', async (req, res) => {
  try {
    // Add database connectivity check
    const dbService = require('../services/databaseService');
    await dbService.checkConnection();
    
    // Add Redis connectivity check
    const cacheService = require('../services/cacheService');
    await cacheService.checkConnection();
    
    res.json({
      status: 'ready',
      service: 'video-metadata',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'connected',
        cache: 'connected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      service: 'video-metadata',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

module.exports = router;
