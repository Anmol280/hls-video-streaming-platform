require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const streamingRoutes = require('./routes/streaming');
const healthRoutes = require('./routes/health');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'media-src': ["'self'", 'blob:'],
      'connect-src': ["'self'"]
    }
  }
}));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.STREAM_RATE_LIMIT) || 3000,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  if (!req.path.endsWith('.ts')) {
    logger.info('Streaming request', { method: req.method, path: req.path, ip: req.ip });
  }
  next();
});

app.use('/api/stream', streamingRoutes);
app.use('/health', healthRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
if (require.main === module) {
  const port = Number(process.env.PORT) || 3005;
  server = app.listen(port, () => {
    logger.info('Video streaming service listening', {
      port,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  const shutdown = async signal => {
    logger.info('Video streaming service shutting down', { signal });
    if (server) await new Promise(resolve => server.close(resolve));
    await require('./services/videoService').close();
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
