'use strict';

const rateLimit = require('express-rate-limit');

function createDockerRateLimiter() {
  return rateLimit({
    windowMs: Number(process.env.DOCKER_RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minute
    max: Number(process.env.DOCKER_RATE_LIMIT_MAX) || 30, // requests per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMIT' });
    },
  });
}

module.exports = createDockerRateLimiter;
