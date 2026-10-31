const logger = require('../../../../shared/libs/logger');

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Request error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    params: req.params,
    query: req.query,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  if (err.code === '23505') { // PostgreSQL unique violation
    return res.status(409).json({
      error: 'Duplicate entry',
      details: 'A record with this information already exists'
    });
  }

  if (err.code === '23503') { // PostgreSQL foreign key violation
    return res.status(400).json({
      error: 'Invalid reference',
      details: 'Referenced record does not exist'
    });
  }

  if (err.code === '23502') { // PostgreSQL not null violation
    return res.status(400).json({
      error: 'Missing required field',
      details: 'A required field is missing'
    });
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      details: 'The uploaded file exceeds the size limit'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      details: 'Too many files uploaded'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file',
      details: 'An unexpected file was uploaded'
    });
  }

  // Rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      details: 'Too many requests, please try again later'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId,
    timestamp: new Date().toISOString()
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    originalEnd.apply(this, args);
  };

  next();
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error factory functions
const createValidationError = (message, details = null) => {
  return new AppError(message, 400, details);
};

const createAuthenticationError = (message = 'Authentication required') => {
  return new AppError(message, 401);
};

const createAuthorizationError = (message = 'Insufficient permissions') => {
  return new AppError(message, 403);
};

const createNotFoundError = (message = 'Resource not found') => {
  return new AppError(message, 404);
};

const createConflictError = (message = 'Resource conflict') => {
  return new AppError(message, 409);
};

const createRateLimitError = (message = 'Rate limit exceeded') => {
  return new AppError(message, 429);
};

const createInternalError = (message = 'Internal server error') => {
  return new AppError(message, 500);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  requestLogger,
  asyncHandler,
  AppError,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  createRateLimitError,
  createInternalError
};
