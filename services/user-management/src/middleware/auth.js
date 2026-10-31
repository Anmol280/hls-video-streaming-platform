const jwt = require('jsonwebtoken');
const database = require('../../../../shared/libs/database');
const redis = require('../../../../shared/libs/redis');
const logger = require('../../../../shared/libs/logger');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Check if user still exists and is active
    const result = await database.query(
      'SELECT id, username, email, role, is_active, is_verified FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is suspended' });
    }
    
    // Add user info to request
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isVerified: user.is_verified
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid access token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to authorize specific roles
const authorizeRoles = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Middleware to check if user is verified
const requireVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  
  next();
};

// Middleware to check if user owns the resource
const checkResourceOwnership = (resourceIdParam = 'id', userIdField = 'user_id', tableName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Admins and moderators can access any resource
      if (['admin', 'moderator'].includes(req.user.role)) {
        return next();
      }
      
      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({ error: 'Resource ID required' });
      }
      
      // Check if user owns the resource
      const result = await database.query(
        `SELECT ${userIdField} FROM ${tableName} WHERE id = $1`,
        [resourceId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Resource not found' });
      }
      
      const resourceOwnerId = result.rows[0][userIdField];
      
      if (resourceOwnerId !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
      
    } catch (error) {
      logger.error('Resource ownership check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Middleware to rate limit based on user role
const roleBasedRateLimit = (limits) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRole = req.user.role;
      const limit = limits[userRole] || limits.default;
      
      if (!limit) {
        return next();
      }
      
      const key = `rate_limit:${userRole}:${req.user.userId}:${req.route.path}`;
      const windowMs = limit.windowMs || 15 * 60 * 1000; // 15 minutes default
      const maxRequests = limit.max;
      
      // Get current count
      const currentCount = await redis.get(key);
      
      if (currentCount && parseInt(currentCount) >= maxRequests) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: new Date(Date.now() + windowMs).toISOString()
        });
      }
      
      // Increment counter
      if (currentCount) {
        await redis.incr(key);
      } else {
        await redis.setex(key, Math.floor(windowMs / 1000), 1);
      }
      
      next();
      
    } catch (error) {
      logger.error('Role-based rate limit error:', error);
      // Don't block request on rate limit errors
      next();
    }
  };
};

// Middleware to log user activities
const logActivity = (activity) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log activity only on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        setImmediate(() => {
          logger.info('User activity', {
            userId: req.user.userId,
            username: req.user.username,
            activity,
            method: req.method,
            path: req.path,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
          });
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware to check API key for service-to-service communication
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
    
    // In production, store API keys in database or environment variables
    const validApiKeys = process.env.VALID_API_KEYS ? process.env.VALID_API_KEYS.split(',') : [];
    
    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    // Set service context
    req.isServiceRequest = true;
    req.apiKey = apiKey;
    
    next();
    
  } catch (error) {
    logger.error('API key authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to validate user session
const validateSession = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    // Check if user has an active session
    const sessionKey = `session:${req.user.userId}`;
    const sessionData = await redis.get(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Extend session
    await redis.expire(sessionKey, 24 * 60 * 60); // 24 hours
    
    next();
    
  } catch (error) {
    logger.error('Session validation error:', error);
    // Don't block request on session errors
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  requireVerification,
  checkResourceOwnership,
  roleBasedRateLimit,
  logActivity,
  authenticateApiKey,
  validateSession
};
