'use strict';

const { verifyAccessToken } = require('@plagard/core/src/auth/jwt');
const { hasMinimumRole } = require('@plagard/core/src/policies');
const logger = require('@plagard/core/src/logger');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação ausente',
    });
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    logger.warn('Invalid access token', { error: err.message, ip: req.ip });
    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido';
    return res.status(401).json({ success: false, error: message });
  }
}

function authorize(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }
    if (!hasMinimumRole(req.user.role, requiredRole)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole,
        path: req.path,
      });
      return res.status(403).json({ success: false, error: 'Acesso negado' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
