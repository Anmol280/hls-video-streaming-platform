const jwt = require('jsonwebtoken');

function optionalAuth(req, res, next) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  const cookieToken = (req.get('Cookie') || '')
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith('access_token='));
  const token = match
    ? match[1]
    : (cookieToken ? cookieToken.slice('access_token='.length) : null);
  if (!token) {
    req.user = null;
    return next();
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Authentication is not configured' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded.sub;
    if (!userId) return res.status(401).json({ error: 'Invalid token' });
    req.user = {
      id: userId,
      userId,
      role: decoded.role || null,
      roles: Array.isArray(decoded.roles) ? decoded.roles : []
    };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return next(error);
  }
}

module.exports = { optionalAuth };
