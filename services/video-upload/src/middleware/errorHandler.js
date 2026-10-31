const logger = require('../utils/logger');
const { VideoUploadError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known custom errors
  if (err instanceof VideoUploadError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      timestamp: err.timestamp
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  // Handle JWT errors
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

  // Handle Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large'
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files'
    });
  }

  // Handle PostgreSQL errors
  if (err.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  if (err.code === '23503') { // Foreign key violation
    return res.status(400).json({
      error: 'Referenced resource does not exist'
    });
  }

  if (err.code === '23502') { // Not null violation
    return res.status(400).json({
      error: 'Required field is missing'
    });
  }

  // Handle AWS S3 errors
  if (err.code === 'NoSuchBucket') {
    return res.status(500).json({
      error: 'Storage configuration error'
    });
  }

  if (err.code === 'AccessDenied') {
    return res.status(500).json({
      error: 'Storage access denied'
    });
  }

  // Handle Redis errors
  if (err.code === 'ECONNREFUSED' && err.address) {
    return res.status(500).json({
      error: 'Service temporarily unavailable'
    });
  }

  // Default error response
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
