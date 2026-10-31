const logger = require('../utils/logger');

function notFoundHandler(req, res) {
  return res.status(404).json({ error: 'Endpoint not found' });
}

function errorHandler(error, req, res, next) {
  logger.error('Streaming request failed', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path
  });
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  return res.status(status).json({
    error: status >= 500 ? 'Streaming request failed' : error.message
  });
}

module.exports = { errorHandler, notFoundHandler };
