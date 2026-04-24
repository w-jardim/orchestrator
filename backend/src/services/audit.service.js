'use strict';

const { getDatabase } = require('../config/database');
const logger = require('../config/plagard-core-shim').logger;

async function logAction({
  tenantId = null,
  userId = null,
  role = null,
  action,
  container = null,
  resource = null,
  payload = null,
  status = 'success',
  ipAddress = null,
  timestamp = null,
}) {
  try {
    const db = getDatabase();
    const createdAt = timestamp ? new Date(timestamp) : new Date();

    await db('audit_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
      action,
      container,
      resource,
      payload: payload ? JSON.stringify(payload) : null,
      status,
      ip_address: ipAddress,
      created_at: createdAt,
    });
  } catch (err) {
    logger.error('Failed to write audit log', {
      error: err.message,
      tenantId,
      userId,
      role,
      action,
      resource,
      container,
    });
  }
}

module.exports = { logAction };
