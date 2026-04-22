'use strict';

const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'users';

async function findByEmail(email) {
  const db = getDatabase();
  return db(TABLE).where({ email }).first();
}

async function findById(id) {
  const db = getDatabase();
  return db(TABLE)
    .where({ id })
    .select('id', 'name', 'email', 'role', 'tenant_id', 'active', 'created_at')
    .first();
}

async function createUser({ name, email, password, role = 'VIEWER', tenantId = null }) {
  const db = getDatabase();

  const existing = await findByEmail(email);
  if (existing) throw new AppError('Email ja cadastrado', 409, 'EMAIL_IN_USE');
  if (role !== 'ADMIN_MASTER' && !tenantId) {
    throw new AppError('Tenant obrigatorio para usuarios nao globais', 422, 'TENANT_REQUIRED');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [id] = await db(TABLE).insert({
    name,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    role,
    tenant_id: tenantId,
    active: true,
  });

  return findById(id);
}

async function validatePassword(user, plainPassword) {
  return bcrypt.compare(plainPassword, user.password_hash);
}

module.exports = { findByEmail, findById, createUser, validatePassword };
