'use strict';

const logger = require('../config/plagard-core-shim').logger;
const { findByEmail, createUser } = require('../services/user.service');
const { ensureDefaultTenant } = require('../services/tenant.service');

async function seedAdmin() {
  const adminEmail = 'admin@plagard.local';

  try {
    const defaultTenant = await ensureDefaultTenant();
    const existing = await findByEmail(adminEmail);

    if (existing) {
      logger.info('Admin user already exists', {
        email: adminEmail,
        tenantId: existing.tenant_id ?? null,
        defaultTenantId: defaultTenant.id,
      });
      return existing;
    }

    const admin = await createUser({
      name: 'Administrator',
      email: adminEmail,
      password: 'Admin@1234',
      role: 'ADMIN_MASTER',
    });

    logger.info('Admin user created by seed', {
      email: adminEmail,
      id: admin.id,
      defaultTenantId: defaultTenant.id,
    });

    return admin;
  } catch (err) {
    logger.error('Failed to seed admin user', { error: err.message });
    throw err;
  }
}

module.exports = seedAdmin;
