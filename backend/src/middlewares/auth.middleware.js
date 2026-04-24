'use strict';

const { verifyAccessToken } = require('../config/plagard-core-shim').auth.jwt;
const { hasMinimumRole } = require('../config/plagard-core-shim').policies;
const logger = require('../config/plagard-core-shim').logger;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticacao ausente',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    payload.tenantId = payload.tenant_id ?? null;
    req.user = payload;
    return next();
  } catch (err) {
    logger.warn('Invalid access token', { error: err.message, ip: req.ip });

    const message = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token invalido';

    return res.status(401).json({ success: false, error: message });
  }
}

function authorize(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Nao autenticado' });
    }

    if (!hasMinimumRole(req.user.role, requiredRole)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Acesso negado',
        code: 'FORBIDDEN',
      });
    }

    return next();
  };
}

module.exports = { authenticate, authorize };
