'use strict';

const { authorize } = require('./auth.middleware');

function rbac(...roles) {
  if (roles.length === 1) {
    return authorize(roles[0]);
  }

  // Para múltiplos roles, retorna middleware que valida qualquer um
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Não autenticado' });
    }

    const { hasMinimumRole } = require('../config/plagard-core-shim').policies;
    const hasRole = roles.some(role => hasMinimumRole(req.user.role, role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error: `Acesso negado. Requerido um desses roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = rbac;
