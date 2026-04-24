'use strict';

const { getDatabase } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'componentes';
const TIPOS_VALIDOS = ['frontend', 'backend', 'worker', 'database', 'cache', 'other'];
const STATUS_VALIDOS = ['planejado', 'ativo', 'pausado', 'deletado'];

function getDb() {
  return getDatabase();
}

function normalizeComponente(row) {
  if (!row) return null;
  return {
    id: row.id,
    projetoId: row.projeto_id,
    nome: row.nome,
    slug: row.slug,
    tipo: row.tipo,
    status: row.status,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

async function criarComponente({ projetoId, nome, slug, tipo, status = 'planejado' }) {
  const db = getDb();

  if (!nome || !slug || !tipo) {
    throw new AppError('Nome, slug e tipo são obrigatórios', 422, 'VALIDATION_ERROR');
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError('Tipo inválido', 422, 'INVALID_TYPE');
  }

  if (status && !STATUS_VALIDOS.includes(status)) {
    throw new AppError('Status inválido', 422, 'INVALID_STATUS');
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
    status,
  });

  return obterComponentePorId(id);
}

async function obterComponentePorId(id) {
  const db = getDb();
  const row = await db(TABLE).where({ id }).first();
  return normalizeComponente(row);
}

async function listarComponentes(projetoId, { page = 1, limit = 20, tipo = null, status = null } = {}) {
  const db = getDb();

  const query = db(TABLE).where({ projeto_id: projetoId });
  if (tipo) query.where({ tipo });
  if (status) query.where({ status });

  const total = await query.clone().count('* as count').first();
  const offset = (page - 1) * limit;

  const rows = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(normalizeComponente),
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  };
}

async function atualizarComponente(id, { nome, slug, tipo, status }) {
  const db = getDb();

  const componente = await obterComponentePorId(id);
  if (!componente) throw new AppError('Componente não encontrado', 404, 'COMPONENT_NOT_FOUND');

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (slug !== undefined) {
    const existing = await db(TABLE)
      .where({ projeto_id: componente.projetoId, slug: slug.toLowerCase() })
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
  if (status !== undefined) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new AppError('Status inválido', 422, 'INVALID_STATUS');
    }
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) {
    return componente;
  }

  await db(TABLE).where({ id }).update(updates);
  return obterComponentePorId(id);
}

async function deletarComponente(id) {
  const db = getDb();

  const componente = await obterComponentePorId(id);
  if (!componente) throw new AppError('Componente não encontrado', 404, 'COMPONENT_NOT_FOUND');

  await db(TABLE).where({ id }).delete();
  return componente;
}

module.exports = {
  TIPOS_VALIDOS,
  STATUS_VALIDOS,
  criarComponente,
  obterComponentePorId,
  listarComponentes,
  atualizarComponente,
  deletarComponente,
};
