const rateLimit = require('express-rate-limit');

// General upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per window
  message: {
    error: 'Too many upload requests. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Bulk upload rate limiting (more restrictive)
const bulkUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 2, // 2 bulk uploads per hour
  message: {
    error: 'Too many bulk upload requests. Please try again later.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Thumbnail upload rate limiting
const thumbnailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 thumbnail uploads per window
  message: {
    error: 'Too many thumbnail upload requests. Please try again later.',
    retryAfter: 5 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Presigned URL generation rate limiting
const presignedUrlLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 presigned URL requests per window
  message: {
    error: 'Too many presigned URL requests. Please try again later.',
    retryAfter: 10 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many API requests. Please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

module.exports = {
  uploadLimiter,
  bulkUploadLimiter,
  thumbnailLimiter,
  presignedUrlLimiter,
  apiLimiter
};
