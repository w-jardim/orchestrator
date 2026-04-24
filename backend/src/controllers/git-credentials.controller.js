'use strict';

const { validationResult } = require('express-validator');
const gitCredentialsService = require('../services/git-credentials.service');
const auditoria = require('../services/audit.service');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function listKeys(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const keys = gitCredentialsService.listSshKeys();

    await auditoria.registrar({
      acao: 'git:list_keys',
      recurso: 'git-credentials',
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.json({ success: true, data: keys });
  } catch (err) {
    return next(err);
  }
}

async function generateKey(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name, comment } = req.body;

    const keypair = gitCredentialsService.generateSshKeypair(name, comment);

    await auditoria.registrar({
      acao: 'git:generate_key',
      recurso: 'git-credentials',
      detalhes: { name },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `SSH key "${name}" generated successfully`,
      data: {
        name: keypair.name,
        publicKey: keypair.publicKey,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function addKey(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name, privateKey, publicKey } = req.body;

    gitCredentialsService.addSshKey(name, privateKey, publicKey);

    await auditoria.registrar({
      acao: 'git:add_key',
      recurso: 'git-credentials',
      detalhes: { name },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: `SSH key "${name}" added successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

async function removeKey(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name } = req.params;

    gitCredentialsService.removeSshKey(name);

    await auditoria.registrar({
      acao: 'git:remove_key',
      recurso: 'git-credentials',
      detalhes: { name },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: `SSH key "${name}" removed successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

async function getFingerprint(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name } = req.params;

    const fingerprint = gitCredentialsService.getSshKeyFingerprint(name);

    await auditoria.registrar({
      acao: 'git:get_fingerprint',
      recurso: 'git-credentials',
      detalhes: { name },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.json({
      success: true,
      data: { name, fingerprint },
    });
  } catch (err) {
    return next(err);
  }
}

async function testAuth(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { repositoryUrl } = req.body;

    const result = gitCredentialsService.testGitAuth(repositoryUrl);

    await auditoria.registrar({
      acao: 'git:test_auth',
      recurso: 'git-credentials',
      detalhes: { repositoryUrl, success: result.success },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: 'Authentication test failed',
        error: result.error,
      });
    }

    return res.json({
      success: true,
      message: 'Authentication test passed',
    });
  } catch (err) {
    return next(err);
  }
}

async function configureGit(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { name, email } = req.body;

    gitCredentialsService.configureGitGlobal(name, email);

    await auditoria.registrar({
      acao: 'git:configure',
      recurso: 'git-credentials',
      detalhes: { name, email },
      usuario_id: req.user.id,
      tenant_id: req.tenantScope.id,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: 'Git configured successfully',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listKeys,
  generateKey,
  addKey,
  removeKey,
  getFingerprint,
  testAuth,
  configureGit,
};
