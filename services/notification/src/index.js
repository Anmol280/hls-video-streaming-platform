const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initializeQueues } = require('./services/queueService');
const socketService = require('./services/socketService');
const logger = require('./utils/logger');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3006;

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

// Initialize Socket.IO service
socketService.initialize(io);

// Routes
app.use('/api/notifications', notificationRoutes);
app.use('/health', healthRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize notification queues
initializeQueues();

// Schedule notification cleanup
cron.schedule('0 1 * * *', () => { // Run daily at 1 AM
  logger.info('Running notification cleanup job');
  require('./services/cleanupService').cleanupOldNotifications();
});

cron.schedule('*/5 * * * *', () => { // Run every 5 minutes
  logger.info('Processing scheduled notifications');
  require('./services/schedulerService').processScheduledNotifications();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  require('./services/queueService').closeQueues();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  require('./services/queueService').closeQueues();
  server.close(() => {
    process.exit(0);
  });
});

server.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
