'use strict';

const { AppError } = require('./error.middleware');

function parseRequestedTenantId(req) {
  const candidate = req.headers['x-tenant-id']
    || req.query.tenantId
    || req.body?.tenantId;

  if (candidate == null || candidate === '') return null;

  const value = Number(candidate);
  if (!Number.isInteger(value) || value < 1) {
    throw new AppError('Tenant invalido', 422, 'INVALID_TENANT_ID');
  }

  return value;
}

function tenantContext(req, _res, next) {
  try {
    if (!req.user) {
      throw new AppError('Nao autenticado', 401, 'UNAUTHENTICATED');
    }

    const requestedTenantId = parseRequestedTenantId(req);
    const isGlobalAdmin = req.user.role === 'ADMIN_MASTER';
    const userTenantId = req.user.tenant_id ?? null;

    if (!isGlobalAdmin && !userTenantId) {
      throw new AppError('Escopo de tenant obrigatorio', 403, 'FORBIDDEN_TENANT_SCOPE');
    }

    if (!isGlobalAdmin && requestedTenantId && Number(requestedTenantId) !== Number(userTenantId)) {
      throw new AppError('Acesso negado ao tenant solicitado', 403, 'FORBIDDEN_TENANT_SCOPE');
    }

    req.user.tenantId = userTenantId;
    req.tenantScope = {
      isGlobalAdmin,
      tenantId: isGlobalAdmin ? requestedTenantId : userTenantId,
      requestedTenantId,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = tenantContext;
