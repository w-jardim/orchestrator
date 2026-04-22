'use strict';

const { getDatabase } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'tenants';
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'local-default';
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'Local Default';
const DEFAULT_TENANT_PLAN = process.env.DEFAULT_TENANT_PLAN || 'ENTERPRISE';

const PLAN_LIMITS = Object.freeze({
  FREE: {
    maxActiveDeploys: 2,
    maxContainers: 2,
    allowedPortRange: { min: 8000, max: 8999 },
  },
  PRO: {
    maxActiveDeploys: 15,
    maxContainers: 15,
    allowedPortRange: { min: 1024, max: 49151 },
  },
  ENTERPRISE: {
    maxActiveDeploys: 100,
    maxContainers: 100,
    allowedPortRange: { min: 1, max: 65535 },
  },
});

function getDb() {
  return getDatabase();
}

function normalizeTenant(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function findTenantById(id) {
  const db = getDb();
  const row = await db(TABLE).where({ id }).first();
  return normalizeTenant(row);
}

async function findTenantBySlug(slug) {
  const db = getDb();
  const row = await db(TABLE).where({ slug }).first();
  return normalizeTenant(row);
}

async function ensureDefaultTenant() {
  const db = getDb();
  const existing = await db(TABLE).where({ slug: DEFAULT_TENANT_SLUG }).first();
  if (existing) return normalizeTenant(existing);

  const [id] = await db(TABLE).insert({
    name: DEFAULT_TENANT_NAME,
    slug: DEFAULT_TENANT_SLUG,
    plan: DEFAULT_TENANT_PLAN,
    status: 'active',
  });

  return findTenantById(id);
}

async function resolveTenantForOperation({ user, requestedTenantId = null, allowDefaultForGlobal = true } = {}) {
  if (user?.role === 'ADMIN_MASTER') {
    if (requestedTenantId) {
      const tenant = await findTenantById(Number(requestedTenantId));
      if (!tenant) throw new AppError('Tenant nao encontrado', 404, 'TENANT_NOT_FOUND');
      return tenant;
    }

    if (user?.tenant_id) {
      const tenant = await findTenantById(Number(user.tenant_id));
      if (tenant) return tenant;
    }

    if (!allowDefaultForGlobal) return null;
    return ensureDefaultTenant();
  }

  if (!user?.tenant_id) {
    throw new AppError('Escopo de tenant obrigatorio', 403, 'FORBIDDEN_TENANT_SCOPE');
  }

  const tenant = await findTenantById(Number(user.tenant_id));
  if (!tenant) throw new AppError('Tenant nao encontrado', 404, 'TENANT_NOT_FOUND');
  return tenant;
}

function getPlanLimits(plan) {
  return PLAN_LIMITS[String(plan || 'FREE').toUpperCase()] || PLAN_LIMITS.FREE;
}

function assertTenantActive(tenant) {
  if (!tenant) throw new AppError('Tenant nao encontrado', 404, 'TENANT_NOT_FOUND');
  if (tenant.status !== 'active') {
    throw new AppError('Tenant inativo ou suspenso', 403, 'TENANT_INACTIVE');
  }
}

module.exports = {
  PLAN_LIMITS,
  DEFAULT_TENANT_SLUG,
  findTenantById,
  findTenantBySlug,
  ensureDefaultTenant,
  resolveTenantForOperation,
  getPlanLimits,
  assertTenantActive,
};
