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

function normalizeUser(row) {
  if (!row) return null;
  const { password_hash, ...userWithoutPassword } = row;
  return userWithoutPassword;
}

async function updateUser(id, { name, email }) {
  const db = getDatabase();

  const user = await findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) {
    const existing = await findByEmail(email);
    if (existing && existing.id !== id) {
      throw new AppError('Email já cadastrado', 409, 'EMAIL_IN_USE');
    }
    updates.email = email.toLowerCase();
  }

  if (Object.keys(updates).length === 0) {
    return user;
  }

  await db(TABLE).where({ id }).update(updates);
  return findById(id);
}

async function deleteUser(id) {
  const db = getDatabase();

  const user = await findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  await db(TABLE).where({ id }).delete();
  return user;
}

async function listUsers(tenantId, { page = 1, limit = 20, role = null } = {}) {
  const db = getDatabase();

  const query = tenantId != null ? db(TABLE).where({ tenant_id: tenantId }) : db(TABLE);
  if (role) query.where({ role });

  const total = await query.clone().count('* as count').first();
  const offset = (page - 1) * limit;

  const rows = await query
    .select('id', 'name', 'email', 'role', 'tenant_id', 'active', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data: rows,
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  };
}

async function changeRole(id, newRole) {
  const db = getDatabase();

  const validRoles = ['ADMIN_MASTER', 'ADMIN', 'OPERATOR', 'VIEWER'];
  if (!validRoles.includes(newRole)) {
    throw new AppError('Role inválida', 422, 'INVALID_ROLE');
  }

  const user = await findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  await db(TABLE).where({ id }).update({ role: newRole });
  return findById(id);
}

async function changeStatus(id, active) {
  const db = getDatabase();

  const user = await findById(id);
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  await db(TABLE).where({ id }).update({ active: active ? 1 : 0 });
  return findById(id);
}

async function changePassword(id, newPassword) {
  const db = getDatabase();

  const user = await db(TABLE).where({ id }).first();
  if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db(TABLE).where({ id }).update({ password_hash: passwordHash });
  return findById(id);
}

module.exports = {
  findByEmail,
  findById,
  createUser,
  validatePassword,
  updateUser,
  deleteUser,
  listUsers,
  changeRole,
  changeStatus,
  changePassword,
  normalizeUser,
};
