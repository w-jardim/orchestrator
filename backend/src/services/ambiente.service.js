'use strict';

const { getDatabase } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'ambientes';
const TIPOS_VALIDOS = ['development', 'staging', 'production'];

function getDb() {
  return getDatabase();
}

function normalizeAmbiente(row) {
  if (!row) return null;
  return {
    id: row.id,
    projetoId: row.projeto_id,
    nome: row.nome,
    slug: row.slug,
    tipo: row.tipo,
    porta: row.porta,
    dominio: row.dominio,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

async function criarAmbiente({ projetoId, nome, slug, tipo, porta = null, dominio = null }) {
  const db = getDb();

  if (!nome || !slug || !tipo) {
    throw new AppError('Nome, slug e tipo são obrigatórios', 422, 'VALIDATION_ERROR');
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError('Tipo inválido', 422, 'INVALID_TYPE');
  }

  const existing = await db(TABLE).where({ projeto_id: projetoId, slug }).first();
  if (existing) {
    throw new AppError('Slug já existe neste projeto', 409, 'SLUG_IN_USE');
  }

  const [id] = await db(TABLE).insert({
    projeto_id: projetoId,
    nome,
    slug: slug.toLowerCase(),
    tipo,
    porta,
    dominio,
  });

  return obterAmbientePorId(id);
}

async function obterAmbientePorId(id) {
  const db = getDb();
  const row = await db(TABLE).where({ id }).first();
  return normalizeAmbiente(row);
}

async function listarAmbientes(projetoId, { page = 1, limit = 20, tipo = null } = {}) {
  const db = getDb();

  const query = db(TABLE).where({ projeto_id: projetoId });
  if (tipo) query.where({ tipo });

  const total = await query.clone().count('* as count').first();
  const offset = (page - 1) * limit;

  const rows = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(normalizeAmbiente),
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  };
}

async function atualizarAmbiente(id, { nome, slug, tipo, porta, dominio }) {
  const db = getDb();

  const ambiente = await obterAmbientePorId(id);
  if (!ambiente) throw new AppError('Ambiente não encontrado', 404, 'ENVIRONMENT_NOT_FOUND');

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (slug !== undefined) {
    const existing = await db(TABLE)
      .where({ projeto_id: ambiente.projetoId, slug: slug.toLowerCase() })
      .andWhere('id', '!=', id)
      .first();
    if (existing) throw new AppError('Slug já existe', 409, 'SLUG_IN_USE');
    updates.slug = slug.toLowerCase();
  }
  if (tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new AppError('Tipo inválido', 422, 'INVALID_TYPE');
    }
    updates.tipo = tipo;
  }
  if (porta !== undefined) updates.porta = porta;
  if (dominio !== undefined) updates.dominio = dominio;

  if (Object.keys(updates).length === 0) {
    return ambiente;
  }

  await db(TABLE).where({ id }).update(updates);
  return obterAmbientePorId(id);
}

async function deletarAmbiente(id) {
  const db = getDb();

  const ambiente = await obterAmbientePorId(id);
  if (!ambiente) throw new AppError('Ambiente não encontrado', 404, 'ENVIRONMENT_NOT_FOUND');

  await db(TABLE).where({ id }).delete();
  return ambiente;
}

module.exports = {
  TIPOS_VALIDOS,
  criarAmbiente,
  obterAmbientePorId,
  listarAmbientes,
  atualizarAmbiente,
  deletarAmbiente,
};
