'use strict';

const logger = require('@plagard/core/src/logger');
const { findByEmail, createUser } = require('../services/user.service');

async function seedAdmin() {
  const adminEmail = 'admin@plagard.local';
  try {
    const existing = await findByEmail(adminEmail);
    if (existing) {
      logger.info('Admin user already exists', { email: adminEmail });
      return existing;
    }

    const admin = await createUser({
      name: 'Administrator',
      email: adminEmail,
      password: 'Admin@1234',
      role: 'ADMIN_MASTER',
    });

    logger.info('Admin user created by seed', { email: adminEmail, id: admin.id });
    return admin;
  } catch (err) {
    logger.error('Failed to seed admin user', { error: err.message });
    throw err;
  }
}

module.exports = seedAdmin;
