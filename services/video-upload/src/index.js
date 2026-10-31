require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const uploadRoutes = require('./routes/upload');
const healthRoutes = require('./routes/health');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const port = Number(process.env.PORT) || 3002;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
  logger.info('Upload request', { method: req.method, path: req.path, ip: req.ip });
  next();
});

app.use('/health', healthRoutes);
app.use('/api/upload', uploadRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
if (require.main === module) {
  server = app.listen(port, () => {
    logger.info('Video upload service listening', {
      port,
      environment: process.env.NODE_ENV || 'development'
    });
  });

  const shutdown = async signal => {
    logger.info('Video upload service shutting down', { signal });
    if (server) await new Promise(resolve => server.close(resolve));
    await require('./controllers/uploadController').close();
    await require('./services/videoService').close();
    process.exit(0);
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
