'use strict';

const { validationResult } = require('express-validator');
const projetoService = require('../services/projeto.service');
const { AppError } = require('../middlewares/error.middleware');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function criar(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { nome, descricao, slug, tipo } = req.body;
    const tenantId = req.tenantScope.tenantId;
    const userId = req.user.id;

    const projeto = await projetoService.criarProjeto({
      tenantId,
      nome,
      descricao,
      slug,
      tipo,
      criadoPor: userId,
    });

    return res.status(201).json({ success: true, data: projeto });
  } catch (err) {
    return next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { page, limit, status, tipo } = req.query;
    const tenantId = req.tenantScope.tenantId;

    const result = await projetoService.listarProjetos(tenantId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status,
      tipo,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantScope.tenantId;

    const projeto = await projetoService.obterProjetoPorId(Number(id));
    if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

    if (projeto.tenantId !== tenantId) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN');
    }

    return res.json({ success: true, data: projeto });
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { id } = req.params;
    const { nome, descricao, slug, status, tipo } = req.body;
    const tenantId = req.tenantScope.tenantId;

    const projeto = await projetoService.obterProjetoPorId(Number(id));
    if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

    if (projeto.tenantId !== tenantId) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN');
    }

    const atualizado = await projetoService.atualizarProjeto(Number(id), {
      nome,
      descricao,
      slug,
      status,
      tipo,
    });

    return res.json({ success: true, data: atualizado });
  } catch (err) {
    return next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantScope.tenantId;

    const projeto = await projetoService.obterProjetoPorId(Number(id));
    if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

    if (projeto.tenantId !== tenantId) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN');
    }

    const deletado = await projetoService.deletarProjeto(Number(id));
    return res.json({ success: true, data: deletado, message: 'Projeto deletado' });
  } catch (err) {
    return next(err);
  }
}

async function obterStatus(req, res, next) {
  try {
    const { id } = req.params;
    const tenantId = req.tenantScope.tenantId;

    const projeto = await projetoService.obterProjetoPorId(Number(id));
    if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

    if (projeto.tenantId !== tenantId) {
      throw new AppError('Acesso negado', 403, 'FORBIDDEN');
    }

    const status = await projetoService.obterStatusProjeto(Number(id));
    return res.json({ success: true, data: status });
  } catch (err) {
    return next(err);
  }
}

module.exports = { criar, listar, obter, atualizar, deletar, obterStatus };
