'use strict';

const { getDatabase } = require('../config/database');
const { AppError } = require('../middlewares/error.middleware');

const TABLE = 'projetos';
const TIPOS_VALIDOS = ['nodejs', 'python', 'docker', 'static', 'custom'];
const STATUS_VALIDOS = ['criacao', 'configuracao', 'ativo', 'pausado', 'deletado'];

function getDb() {
  return getDatabase();
}

function normalizeProjeto(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    nome: row.nome,
    descricao: row.descricao,
    slug: row.slug,
    status: row.status,
    tipo: row.tipo,
    criadoPor: row.created_by,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

async function criarProjeto({ tenantId, nome, descricao, slug, tipo = 'custom', criadoPor = null }) {
  const db = getDb();

  if (!nome || !slug) {
    throw new AppError('Nome e slug são obrigatórios', 422, 'VALIDATION_ERROR');
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw new AppError('Tipo inválido', 422, 'INVALID_TYPE');
  }

  const existing = await db(TABLE).where({ tenant_id: tenantId, slug }).first();
  if (existing) {
    throw new AppError('Slug já existe neste tenant', 409, 'SLUG_IN_USE');
  }

  const [id] = await db(TABLE).insert({
    tenant_id: tenantId,
    nome,
    descricao,
    slug: slug.toLowerCase(),
    tipo,
    created_by: criadoPor,
    status: 'criacao',
  });

  return obterProjetoPorId(id);
}

async function obterProjetoPorId(id) {
  const db = getDb();
  const row = await db(TABLE).where({ id }).first();
  return normalizeProjeto(row);
}

async function obterProjetoPorSlug(tenantId, slug) {
  const db = getDb();
  const row = await db(TABLE).where({ tenant_id: tenantId, slug }).first();
  return normalizeProjeto(row);
}

async function listarProjetos(tenantId, { page = 1, limit = 20, status = null, tipo = null } = {}) {
  const db = getDb();

  const query = db(TABLE).where({ tenant_id: tenantId });
  if (status) query.where({ status });
  if (tipo) query.where({ tipo });

  const total = await query.clone().count('* as count').first();
  const offset = (page - 1) * limit;

  const rows = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(normalizeProjeto),
    pagination: {
      page,
      limit,
      total: total.count,
      pages: Math.ceil(total.count / limit),
    },
  };
}

async function atualizarProjeto(id, { nome, descricao, slug, status, tipo }) {
  const db = getDb();

  const projeto = await obterProjetoPorId(id);
  if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

  const updates = {};
  if (nome !== undefined) updates.nome = nome;
  if (descricao !== undefined) updates.descricao = descricao;
  if (slug !== undefined) {
    const existing = await db(TABLE)
      .where({ tenant_id: projeto.tenantId, slug: slug.toLowerCase() })
      .andWhere('id', '!=', id)
      .first();
    if (existing) throw new AppError('Slug já existe', 409, 'SLUG_IN_USE');
    updates.slug = slug.toLowerCase();
  }
  if (status !== undefined) {
    if (!STATUS_VALIDOS.includes(status)) {
      throw new AppError('Status inválido', 422, 'INVALID_STATUS');
    }
    updates.status = status;
  }
  if (tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(tipo)) {
      throw new AppError('Tipo inválido', 422, 'INVALID_TYPE');
    }
    updates.tipo = tipo;
  }

  if (Object.keys(updates).length === 0) {
    return projeto;
  }

  await db(TABLE).where({ id }).update(updates);
  return obterProjetoPorId(id);
}

async function deletarProjeto(id) {
  const db = getDb();

  const projeto = await obterProjetoPorId(id);
  if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

  await db(TABLE).where({ id }).delete();
  return projeto;
}

async function obterStatusProjeto(id) {
  const db = getDb();
  const projeto = await obterProjetoPorId(id);
  if (!projeto) throw new AppError('Projeto não encontrado', 404, 'PROJECT_NOT_FOUND');

  return {
    id: projeto.id,
    nome: projeto.nome,
    status: projeto.status,
    criadoEm: projeto.criadoEm,
    atualizadoEm: projeto.atualizadoEm,
  };
}

module.exports = {
  TIPOS_VALIDOS,
  STATUS_VALIDOS,
  criarProjeto,
  obterProjetoPorId,
  obterProjetoPorSlug,
  listarProjetos,
  atualizarProjeto,
  deletarProjeto,
  obterStatusProjeto,
};
