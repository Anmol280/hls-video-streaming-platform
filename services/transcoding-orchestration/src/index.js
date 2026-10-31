const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const transcodingRoutes = require('./routes/transcoding');
const healthRoutes = require('./routes/health');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initializeQueues } = require('./services/queueService');
const logger = require('./utils/logger');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });
  next();
});

// Routes
app.use('/api/transcoding', transcodingRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize job queues
initializeQueues();

// Schedule cleanup jobs
cron.schedule('0 2 * * *', () => { // Run daily at 2 AM
  logger.info('Running daily cleanup job');
  require('./services/cleanupService').runDailyCleanup();
});

cron.schedule('*/15 * * * *', () => { // Run every 15 minutes
  logger.info('Running queue health check');
  require('./services/queueService').healthCheck();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  require('./services/queueService').closeQueues();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  require('./services/queueService').closeQueues();
  process.exit(0);
});

app.listen(PORT, () => {
  logger.info(`Transcoding Orchestration Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
