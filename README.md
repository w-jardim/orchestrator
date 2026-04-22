# Plagard Orchestrator

Plataforma de orquestração de infraestrutura e SaaS com controle total de containers Docker, deploys, Nginx, SSL e automações via agentes.

## Arquitetura

```
plagard-orchestrator/
├── backend/        # API REST (Express)
├── worker/         # Executor de tarefas assíncronas (BullMQ)
├── frontend/       # Painel web (React — Fase futura)
├── core/           # Módulos compartilhados (logger, auth, queue)
├── integrations/   # Integrações externas (Docker, Nginx, SSL, Git)
├── agents/         # Automações inteligentes
└── database/       # Migrations SQL
```

## Pré-requisitos

- Docker 24+
- Docker Compose 2.20+
- Node.js 20+ (para desenvolvimento local)
- npm 10+

## Início rápido

```bash
# 1. Clonar variáveis de ambiente
cp .env.example .env

# 2. Editar .env com os valores corretos
# (especialmente JWT_ACCESS_SECRET)

# 3. Subir a infraestrutura
docker compose up -d

# 4. Verificar saúde da API
curl http://localhost:3000/saude
```

## Desenvolvimento local

```bash
# Instalar dependências de todos os workspaces
npm install

# Rodar backend em modo dev
npm run dev:backend

# Rodar worker em modo dev
npm run dev:worker
```

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|---|---|---|
| `PORT` | Porta do backend | `3000` |
| `NODE_ENV` | Ambiente de execução | `development` |
| `JWT_ACCESS_SECRET` | Segredo para assinar tokens | *obrigatório* |
| `JWT_ACCESS_EXPIRES` | Expiração do access token | `15m` |
| `DB_HOST` | Host do MySQL | `mysql` |
| `DB_PORT` | Porta do MySQL | `3306` |
| `DB_USER` | Usuário do MySQL | `orchestrator` |
| `DB_PASS` | Senha do MySQL | — |
| `DB_NAME` | Nome do banco | `plagard_orchestrator` |
| `REDIS_HOST` | Host do Redis | `redis` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `REDIS_PASS` | Senha do Redis | — |

## Endpoints — Fase 1

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| `GET` | `/saude` | Health check | Não |
| `POST` | `/api/v1/auth/login` | Autenticação | Não |
| `GET` | `/api/v1/auth/me` | Perfil do usuário | Sim |

## Roles de Acesso

| Role | Descrição |
|---|---|
| `ADMIN_MASTER` | Acesso total |
| `ADMIN` | Administração geral |
| `OPERATOR` | Operações de deploy e containers |
| `VIEWER` | Apenas leitura |

## Fases de Implementação

- [x] **Fase 1** — Base: backend, auth, logs, fila
- [ ] **Fase 2** — Docker Control
- [ ] **Fase 3** — Deploy de projetos
- [ ] **Fase 4** — Nginx + SSL
- [ ] **Fase 5** — Agents
- [ ] **Fase 6** — Hardening
