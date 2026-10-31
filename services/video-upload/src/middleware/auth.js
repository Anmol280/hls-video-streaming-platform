const jwt = require('jsonwebtoken');

function tokenFromRequest(req) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

const authMiddleware = async (req, res, next) => {
  const token = tokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded.sub;
    if (!userId) return res.status(401).json({ error: 'Invalid token' });

    const videoService = require('../services/videoService');
    const user = await videoService.findActiveUserById(userId);
    if (!user) return res.status(401).json({ error: 'Invalid or inactive user' });

    req.user = {
      id: user.id,
      userId: user.id,
      role: user.role,
      roles: [user.role]
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return next(error);
  }
};

const requireRole = roles => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  return next();
};

const validateOwnership = async (req, res, next) => {
  const videoId = req.params.videoId || req.params.uploadId;
  if (!videoId) return res.status(400).json({ error: 'Video ID is required' });

  try {
    const videoService = require('../services/videoService');
    const video = await videoService.getVideoById(videoId);
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.userId !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    req.video = video;
    return next();
  } catch (error) {
    return next(error);
  }
};

const serviceAuth = (req, res, next) => {
  const expectedToken = process.env.SERVICE_AUTH_TOKEN;
  const serviceToken = req.get('x-service-auth');
  if (!expectedToken || !serviceToken || serviceToken !== expectedToken) {
    return res.status(401).json({ error: 'Invalid service authentication' });
  }
  return next();
};

module.exports = { authMiddleware, requireRole, validateOwnership, serviceAuth };
