'use strict';

const { validationResult } = require('express-validator');
const ambienteService = require('../services/ambiente.service');
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

async function validarProjetoTenant(projetoId, tenantId) {
  const projeto = await projetoService.obterProjetoPorId(projetoId);
  if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');
  if (projeto.tenantId !== tenantId) {
    throw new AppError('Acesso negado', 403, 'FORBIDDEN');
  }
  return projeto;
}

async function criar(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { projetoId } = req.params;
    const { nome, slug, tipo, porta, dominio } = req.body;
    const tenantId = req.tenantScope.tenantId;

    await validarProjetoTenant(Number(projetoId), tenantId);

    const ambiente = await ambienteService.criarAmbiente({
      projetoId: Number(projetoId),
      nome,
      slug,
      tipo,
      porta,
      dominio,
    });

    return res.status(201).json({ success: true, data: ambiente });
  } catch (err) {
    return next(err);
  }
}

async function listar(req, res, next) {
  try {
    const { projetoId } = req.params;
    const { page, limit, tipo } = req.query;
    const tenantId = req.tenantScope.tenantId;

    await validarProjetoTenant(Number(projetoId), tenantId);

    const result = await ambienteService.listarAmbientes(Number(projetoId), {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      tipo,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function obter(req, res, next) {
  try {
    const { projetoId, ambienteId } = req.params;
    const tenantId = req.tenantScope.tenantId;

    await validarProjetoTenant(Number(projetoId), tenantId);

    const ambiente = await ambienteService.obterAmbientePorId(Number(ambienteId));
    if (!ambiente) throw new AppError('Ambiente não encontrado', 404, 'ENVIRONMENT_NOT_FOUND');

    if (ambiente.projetoId !== Number(projetoId)) {
      throw new AppError('Ambiente não pertence a este projeto', 404, 'NOT_FOUND');
    }

    return res.json({ success: true, data: ambiente });
  } catch (err) {
    return next(err);
  }
}

async function atualizar(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;

    const { projetoId, ambienteId } = req.params;
    const { nome, slug, tipo, porta, dominio } = req.body;
    const tenantId = req.tenantScope.tenantId;

    await validarProjetoTenant(Number(projetoId), tenantId);

    const ambiente = await ambienteService.obterAmbientePorId(Number(ambienteId));
    if (!ambiente) throw new AppError('Ambiente não encontrado', 404, 'ENVIRONMENT_NOT_FOUND');

    if (ambiente.projetoId !== Number(projetoId)) {
      throw new AppError('Ambiente não pertence a este projeto', 404, 'NOT_FOUND');
    }

    const atualizado = await ambienteService.atualizarAmbiente(Number(ambienteId), {
      nome,
      slug,
      tipo,
      porta,
      dominio,
    });

    return res.json({ success: true, data: atualizado });
  } catch (err) {
    return next(err);
  }
}

async function deletar(req, res, next) {
  try {
    const { projetoId, ambienteId } = req.params;
    const tenantId = req.tenantScope.tenantId;

    await validarProjetoTenant(Number(projetoId), tenantId);

    const ambiente = await ambienteService.obterAmbientePorId(Number(ambienteId));
    if (!ambiente) throw new AppError('Ambiente não encontrado', 404, 'ENVIRONMENT_NOT_FOUND');

    if (ambiente.projetoId !== Number(projetoId)) {
      throw new AppError('Ambiente não pertence a este projeto', 404, 'NOT_FOUND');
    }

    const deletado = await ambienteService.deletarAmbiente(Number(ambienteId));
    return res.json({ success: true, data: deletado });
  } catch (err) {
    return next(err);
  }
}

module.exports = { criar, listar, obter, atualizar, deletar };
