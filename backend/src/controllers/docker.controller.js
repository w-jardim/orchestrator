'use strict';

const { validationResult } = require('express-validator');
const dockerService = require('../services/docker.service');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function list(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const all = req.query.all === 'true';
    const containers = await dockerService.listContainers({
      all,
      user: req.user,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, count: containers.length, data: containers });
  } catch (err) {
    return next(err);
  }
}

async function inspect(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const container = await dockerService.getContainer({
      id: req.params.id,
      user: req.user,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, data: container });
  } catch (err) {
    return next(err);
  }
}

async function start(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    await dockerService.startContainer({
      id: req.params.id,
      user: req.user,
      ip: req.ip,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, message: 'Container iniciado com sucesso' });
  } catch (err) {
    return next(err);
  }
}

async function stop(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const timeout = Number(req.body?.timeout) || 10;
    await dockerService.stopContainer({
      id: req.params.id,
      timeout,
      user: req.user,
      ip: req.ip,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, message: 'Container parado com sucesso' });
  } catch (err) {
    return next(err);
  }
}

async function restart(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const timeout = Number(req.body?.timeout) || 10;
    await dockerService.restartContainer({
      id: req.params.id,
      timeout,
      user: req.user,
      ip: req.ip,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, message: 'Container reiniciado com sucesso' });
  } catch (err) {
    return next(err);
  }
}

async function logs(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const tail = Number(req.query.tail) || 100;
    const timestamps = req.query.timestamps === 'true';
    const lines = await dockerService.getContainerLogs({
      id: req.params.id,
      tail,
      timestamps,
      user: req.user,
      ip: req.ip,
      tenantScope: req.tenantScope,
    });
    return res.json({ success: true, count: lines.length, data: lines });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, inspect, start, stop, restart, logs };
