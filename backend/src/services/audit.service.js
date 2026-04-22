'use strict';

const { getDatabase } = require('../config/database');
const logger = require('@plagard/core/src/logger');

async function logAction({
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
      action,
      resource,
      container,
      userId,
      role,
    });
  }
}

module.exports = { logAction };
