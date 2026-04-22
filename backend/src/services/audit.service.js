'use strict';

const { getDatabase } = require('../config/database');
const logger = require('@plagard/core/src/logger');

/**
 * @param {object} params
 * @param {number|null}  params.userId
 * @param {string}       params.action      — ex: 'docker.container.start'
 * @param {string|null}  params.resource    — ex: container id/name
 * @param {object|null}  params.payload     — dados relevantes da ação
 * @param {'success'|'failure'|'pending'} params.status
 * @param {string|null}  params.ipAddress
 */
async function logAction({ userId = null, action, resource = null, payload = null, status = 'success', ipAddress = null }) {
  try {
    const db = getDatabase();
    await db('audit_logs').insert({
      user_id: userId,
      action,
      resource,
      payload: payload ? JSON.stringify(payload) : null,
      status,
      ip_address: ipAddress,
    });
  } catch (err) {
    // Falha na auditoria nunca deve derrubar a operação principal
    logger.error('Failed to write audit log', { error: err.message, action, resource });
  }
}

module.exports = { logAction };
