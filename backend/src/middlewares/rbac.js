'use strict';

const { authorize } = require('./auth.middleware');

function rbac(...roles) {
  // Se múltiplos roles, verifica se usuario tem qualquer um deles
  // Se um único role, passa para authorize normalmente
  if (roles.length === 1) {
    return authorize(roles[0]);
  }

  // Para múltiplos roles, retorna middleware que valida qualquer um
  return (req, res, next) => {
    const { authorize: authMiddleware } = require('./auth.middleware');
    // Chama o authorize do primeiro role (vai validar se está autenticado)
    // Depois verifica se tem algum dos roles
    authMiddleware(roles[0])(req, res, () => {
      const { hasMinimumRole } = require('../config/plagard-core-shim').policies;
      const hasRole = roles.some(role => hasMinimumRole(req.user.role, role));

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: `Acesso negado. Requerido um desses roles: ${roles.join(', ')}`,
        });
      }
      next();
    });
  };
}

module.exports = rbac;
