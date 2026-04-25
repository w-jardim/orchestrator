# 🔍 AUDITORIA DE ARQUITETURA — Plagard Orchestrator

**Data**: 25 de Abril de 2026  
**Status**: Análise Completa  
**Repositório**: w-jardim/orchestrator

---

## 📊 RESUMO EXECUTIVO

O Plagard Orchestrator é um SaaS multi-tenant **bem estruturado em camadas SaaS e Frontend**, mas **INCOMPLETO na camada DevOps**.

**Aderência à Arquitetura Desejada**: **45%**

- ✅ SaaS Base: 100% implementado
- ✅ Frontend: 100% implementado  
- ⚠️ Core Operacional: 50% (Projects, Environments, Components, MAS Projects não é operacional)
- ⚠️ DevOps Engine: 20% (Docker básico, Deploy desvinculado, Git apenas credenciais)
- ⚠️ Observabilidade: 60% (Health, Audit presentes, Monitoring script)
- ❌ Comercial SaaS: 0%

---

## 1. MÓDULOS ENCONTRADOS ✅

### 1.1 SaaS Base (Completo)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Tenants** | ✅ 100% | CRUD, Planos (FREE/PRO/ENTERPRISE), Isolamento |
| **Users** | ✅ 100% | CRUD, 4 roles (ADMIN_MASTER/ADMIN/OPERATOR/VIEWER), Bcrypt |
| **Auth** | ✅ 100% | JWT (15m), Refresh token, Login/Logout |
| **RBAC** | ✅ 100% | Middleware tenant-context, validação por role |

### 1.2 Core Operacional (Parcial)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Projects** | ⚠️ 50% | CRUD básico, Tipos (nodejs/python/docker/static/custom), SEM campos operacionais |
| **Environments** | ✅ 100% | CRUD por projeto, 3 tipos (dev/staging/prod) |
| **Components** | ✅ 100% | CRUD por projeto, 6 tipos |
| **Project Operations** | ❌ 0% | TABELA NÃO EXISTE |

### 1.3 DevOps Engine (Fragmentado)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Docker Manager** | ✅ 80% | Containers (list/inspect/start/stop/restart/logs/remove), Images (list/pull/build/remove) |
| **Deploy** | ⚠️ 40% | Tabela + Service, MAS desvinculado de Projects, sem git/docker-compose/backup |
| **Git Manager** | ❌ 10% | APENAS gerenciamento SSH credentials, SEM operações reais (pull/status/logs) |
| **Env Manager** | ❌ 0% | NÃO EXISTE |
| **Nginx Manager** | ❌ 0% | NÃO EXISTE (config estática em /nginx) |
| **SSL/Certbot** | ❌ 5% | Apenas script `/scripts/setup-ssl.sh` |
| **Backup/Restore** | ❌ 0% | NÃO EXISTE |
| **Worker/Queue** | ⚠️ 30% | Redis + Queue existem, apenas deploy processor |

### 1.4 Observabilidade (Parcial)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Health** | ✅ 80% | Checks básicos (DB, Redis, uptime) |
| **Audit** | ✅ 90% | Log completo com tenant/user/action/resource/payload |
| **Monitoring** | ⚠️ 40% | Script `/scripts/monitor.sh`, não integrado |
| **Logs** | ⚠️ 70% | Via Docker, não agregado |

### 1.5 Frontend (Completo)

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Dashboard** | ✅ 100% | Stats, Containers, Deploys, Health |
| **Projects Page** | ✅ 100% | CRUD, Listing |
| **Containers Page** | ✅ 100% | List, Inspect, Actions |
| **Deploys Page** | ✅ 100% | History, Status |
| **Users Page** | ✅ 100% | CRUD, RBAC assignment |
| **Health Page** | ✅ 100% | Status visual |

---

## 2. MÓDULOS AUSENTES ❌

| Módulo | Prioridade | Razão |
|--------|-----------|-------|
| **Project Operations** | CRÍTICA | Sem motor de operações vinculado a Projetos |
| **Git Operations** | CRÍTICA | Sem integração real com repositórios |
| **Env Manager** | ALTA | Não gerencia `.env` com segurança |
| **Nginx Manager** | ALTA | Sem criação dinâmica de server blocks |
| **SSL/Certbot** | ALTA | Apenas script, sem integração API |
| **Backup Manager** | MÉDIA | Sem backup/restore de projetos |
| **Rollback** | MÉDIA | Deploy sem falha automática |
| **Path Whitelist** | CRÍTICA | Sem validação de operações em `/opt/apps/projects` |
| **Docker Labels** | ALTA | Sem rastreamento Plagard de containers |

---

## 3. MÓDULOS INCOMPLETOS ⚠️

### 3.1 Projects Foundation (50% → Necessita Refactor)

**Estado Atual**:
```sql
CREATE TABLE `projetos` (
  id, tenant_id, nome, descricao, slug, status, tipo, created_by, created_at, updated_at
)
```

**Campos Ausentes**:
- ❌ `path` — Caminho no VPS (ex: `/opt/apps/projects/virazul`)
- ❌ `repository_url` — Git repo (ex: `https://github.com/w-jardim/app-virazul.git`)
- ❌ `default_branch` — Branch padrão (ex: `main`)
- ❌ `stack_type` — Stack (ex: `docker_compose`)
- ❌ `compose_file` — Arquivo docker-compose (ex: `docker-compose.yml`)
- ❌ `main_domain` — Domínio principal (ex: `virazul.com`)
- ❌ `api_domain` — Domínio da API (ex: `api.virazul.com`)
- ❌ `deleted_at` — Soft delete
- ❌ `last_deploy_at` — Timestamp do último deploy
- ❌ `last_health_status` — Status último health check

**Relações Ausentes**:
- ❌ Vínculo com `project_operations`
- ❌ Vínculo com Docker containers via labels
- ❌ Vínculo com domínios/Nginx

**Risco**: Projetos são cadastros, não unidades operacionais.

### 3.2 Deploy Service (40% → Requer Integração)

**O que Existe**:
```
deploy.service.js (19 KB)
- Create, Get, List, Update status
- Database operations
- Error handling
```

**O que Falta**:
- ❌ Validação de projeto
- ❌ Validação de path whitelist
- ❌ Git pull
- ❌ Build execution
- ❌ Docker compose up -d
- ❌ Health check pós-deploy
- ❌ Backup pré-deploy
- ❌ Rollback automático em falha
- ❌ Vínculo com project_operations

**Fluxo Esperado (Fase 6)** vs **Fluxo Atual**:
```
Esperado:
1. Validar projeto
2. Validar path
3. Criar operação
4. Backup pré-deploy
5. Git pull
6. Build
7. Docker compose up
8. Health check
9. Log resultado
10. Rollback se falhar

Atual:
1. Create deploy record
2. Update status
3. That's it
```

### 3.3 Git Manager (10% → Requer Implementação)

**O que Existe**:
```
git-credentials.service.js (4.7 KB)
- Generate SSH keypair
- Add/Remove keys
- Get fingerprint
- Test auth
```

**O que Falta**:
- ❌ `git.service.js` com operações reais
- ❌ `gitPull(projectPath, branch)`
- ❌ `gitStatus(projectPath)`
- ❌ `gitLog(projectPath, limit)`
- ❌ `gitCurrentBranch(projectPath)`
- ❌ `gitValidateRepo(repoUrl)`
- ❌ Integração com project_operations
- ❌ Sem shell injection (precisa execFile, não execSync)

**Risco Crítico**: Sem operações git reais, deploy não consegue atualizar código.

### 3.4 Docker Project Binding (0% → Requer Implementação)

**O que Não Existe**:
- ❌ Labels Docker Plagard:
  ```
  plagard.managed=true
  plagard.tenant_id=1
  plagard.project_id=5
  plagard.environment=production
  ```
- ❌ Mapping container → projeto no banco
- ❌ Restart/logs por projeto
- ❌ Health check por componente

**Risco**: Um container pode ser gerenciado sem saber a qual projeto pertence.

### 3.5 Env Manager (0% → Requer Implementação)

**O que Não Existe**:
- ❌ Tabela `project_envvars`
- ❌ Ler `.env` com segurança
- ❌ Editar `.env` com mascaramento
- ❌ Backup antes de salvar
- ❌ Auditoria de mudanças
- ❌ Validação de chaves

**Risco**: `.env` pode ser exposto via API ou sobrescrito acidentalmente.

### 3.6 Nginx Manager (0% → Requer Implementação)

**O que Não Existe**:
- ❌ Criar server blocks dinamicamente
- ❌ Editar proxy_pass
- ❌ Validar conflito de domínios
- ❌ `nginx -t` antes de reload
- ❌ Reload seguro
- ❌ Backup de config

**O que Existe**:
- ✅ Config estática `/nginx/nginx.conf`
- ✅ Docker container nginx

**Risco**: Domínios não podem ser adicionados sem restart manual.

### 3.7 SSL/Certbot Manager (5% → Requer Implementação)

**O que Não Existe**:
- ❌ API para emitir certificados
- ❌ Validação DNS automatizada
- ❌ Renovação automática
- ❌ Verificação de expiração
- ❌ Integração com Nginx

**O que Existe**:
- ✅ Script `/scripts/setup-ssl.sh`

**Risco**: SSL deve ser emitido manualmente, não via painel.

### 3.8 Backup Manager (0% → Requer Implementação)

**O que Não Existe**:
- ❌ Backup de projeto (código + DB)
- ❌ Backup de `.env`
- ❌ Backup de banco (MySQL dump)
- ❌ Restore automático
- ❌ Política de retenção
- ❌ Validação de integridade

**Risco**: Sem backup, perda de dados é irreversível.

### 3.9 Worker/Fila (30% → Requer Expansão)

**O que Existe**:
- ✅ Redis queue via `/core/src/queue`
- ✅ Worker process `/worker/src/index.js`
- ✅ Deploy processor `/worker/src/processors/deploy.processor.js`

**O que Falta**:
- ❌ Git pull processor
- ❌ Build processor
- ❌ Backup processor
- ❌ SSL processor
- ❌ Nginx reload processor
- ❌ Health check processor
- ❌ Retry logic configurável
- ❌ DLQ (Dead Letter Queue)

---

## 4. RISCOS CRÍTICOS 🚨

### 4.1 Path Safety (CRÍTICO)

**Problema**: Sem whitelist, operações podem atingir paths perigosos.

```javascript
// INSEGURO: Sem validação
async function executarGit(userPath, comando) {
  return execSync(`cd ${userPath} && ${comando}`);
}

// Risco: usuário pode passar:
// "../../../../etc && cat /etc/shadow"
```

**Impacto**: Execução de comandos arbitrários, acesso a `/etc`, `/root`, `/var/lib/mysql`.

**Recomendação**: Whitelist em `/opt/apps/projects` e `/opt/orchestrator` APENAS.

### 4.2 Shell Injection (CRÍTICO)

**Problema**: `git-credentials.service.js` pode usar shell commands sem sanitizar.

```javascript
// Potencial risco
gitCredentialsService.testGitAuth(repositoryUrl);
// Se internamente usar:
// execSync(`git clone ${repositoryUrl} /tmp/test`)
```

**Impacto**: Injeção de comandos via `repositoryUrl`.

**Recomendação**: SEMPRE usar `execFile` ou `spawn` com arrays de args, NUNCA shell=true.

### 4.3 Secrets Exposure (CRÍTICO)

**Problema**: `.env` pode ser lido/exposto via API.

**Impacto**:
- Chave de banco
- JWT secret
- Git credentials
- SSH keys

**Recomendação**: 
1. Nunca retornar `.env` completo
2. Mascarar values (show apenas primeiras 4 chars)
3. Logging com sanitização

### 4.4 Tenant Isolation (CRÍTICO)

**Problema**: Se middleware `tenant-context.middleware.js` falhar, um tenant acessa dados de outro.

**Exemplos de Falha**:
- Controller não verifica `tenantId` em resposta (ex: projeto do tenant B acessível por tenant A)
- Query sem WHERE tenant_id

**Impacto**: Vazamento de dados entre clientes.

**Recomendação**: SEMPRE verificar:
```javascript
if (projeto.tenantId !== req.tenantScope.tenantId) {
  throw new AppError('Forbidden', 403);
}
```

### 4.5 Docker Permissions (CRÍTICO)

**Problema**: Docker socket acessível sem RBAC fino.

**Impacto**:
- Operador do Tenant A pode parar container do Tenant B
- Sem labels, não há rastreamento de propriedade

**Recomendação**: 
1. Implementar labels Plagard
2. Validar tenant_id + project_id antes de qualquer operação Docker
3. Allowlist de containers por tenant

### 4.6 SQL Injection (MÉDIO)

**Status**: Knex protege com parametrização, MAS:
- User inputs em WHERE clauses devem ser validados
- JSON fields precisam de cuidado

**Exemplo Seguro (Knex)**:
```javascript
db('projetos').where({ tenant_id: tenantId, slug: slug })
// Parametrizado automaticamente
```

**Exemplo Inseguro**:
```javascript
db.raw(`SELECT * FROM projetos WHERE slug = '${slug}'`)
// NÃO FAZER ISSO
```

### 4.7 Operational Transactions (ALTO)

**Problema**: Deploy falha no meio (ex: git pull falha, docker compose falha), sem rollback.

**Impacto**: Sistema em estado inconsistente (deploy marcado como success, mas containers não rodando).

**Recomendação**: 
1. `project_operations` com status queued/running/success/failed/cancelled
2. Rollback automático (docker compose down, restore backup)
3. Transações de banco

### 4.8 Audit Completeness (MÉDIO)

**Status**: Audit logs existem, MAS não cobrem operações DevOps reais.

**O que Não é Auditado**:
- Deploy failure details
- Git pull commands
- Docker compose execution
- Nginx reload
- SSL issuance

**Recomendação**: Estender audit para todas as operações.

---

## 5. ORDEM DE EXECUÇÃO RECOMENDADA 📋

Seguindo princípios de "não quebrar o que funciona", "ser incremental", "validável".

### **FASE 0** — Documentação (Já Existe ✅)
- ✅ docs/ARCHITECTURE.md
- ✅ docs/DEPLOYMENT.md
- ✅ docs/SERVICES.md

### **FASE 1** — Projects Foundation (CRÍTICA) — **2-3 semanas**

Tornar `projetos` uma unidade operacional real.

**Tasks**:
1. Migração para adicionar campos (path, repo_url, branch, stack_type, compose_file, domains, soft_delete)
2. Path whitelist service
3. Validator para slug forte
4. Soft delete com updated_at
5. Update projeto.service.js
6. Update projeto.controller.js (validações)
7. Update frontend ProjectsPage
8. Testes

**Resultado**: Projetos vinculados a paths, repos, stacks reais.

### **FASE 2** — Project Operations (CRÍTICA) — **2 semanas**

Motor de operações com rastreamento.

**Tasks**:
1. Criar migração `project_operations` table
2. Criar `project-operations.service.js`
3. Criar `project-operations.controller.js` + routes
4. Criar `project-operations.processor.js` (worker)
5. Testes

**Schema**:
```sql
CREATE TABLE `project_operations` (
  id, tenant_id, project_id, environment_id, user_id,
  operation_type, status, started_at, finished_at, duration_ms,
  error_code, error_details, logs, created_at
)
```

**Resultado**: Todas as operações rastreáveis.

### **FASE 3** — Git Operations (CRÍTICA) — **3 semanas**

Integração segura com repositórios Git.

**Tasks**:
1. Criar `git.service.js` com operações reais
   - `gitClone(repoUrl, localPath, sshKey)`
   - `gitPull(projectPath)`
   - `gitStatus(projectPath)`
   - `gitLog(projectPath, limit)`
   - `gitCurrentBranch(projectPath)`
   - Sem shell injection (usar execFile)
2. Path safety middleware
3. Integração com projeto_operations
4. Testes (unit + integration)

**Resultado**: Deploy consegue fazer git pull seguro.

### **FASE 4** — Docker Project Binding (IMPORTANTE) — **2 semanas**

Rastreamento Plagard de containers.

**Tasks**:
1. Refatorar docker.service.js para validar projeto
2. Adicionar labels Plagard ao criar/iniciar containers
3. Criar mapping container → projeto no banco (ou usar labels como source-of-truth)
4. Validar tenant + project antes de cada operação
5. Testes

**Labels**:
```
plagard.managed=true
plagard.tenant_id=X
plagard.project_id=Y
plagard.environment=Z
plagard.component=frontend
```

**Resultado**: Docker isolado por tenant/projeto.

### **FASE 5** — Deploy Engine v2 (IMPORTANTE) — **3 semanas**

Refatorar deploy para pipeline completo.

**Tasks**:
1. Refatorar `deploy.service.js`:
   - Validar projeto + path + tenant
   - Criar operação em project_operations
   - Backup pré-deploy (opcional)
   - Git pull
   - Build (docker-compose build ou custom)
   - Docker compose up -d
   - Health check (retry 30s, 5 tentativas)
   - Log resultado
   - Rollback se falhar (docker-compose down, restore backup)
2. Integrar com git.service.js
3. Integrar com docker.service.js
4. Worker processor robusto
5. Testes

**Fluxo**:
```
Projeto virazul, branch main:
1. Criar project_operation (status=queued)
2. Enfileirar job
3. Worker inicia:
   - Marcar como running
   - Validar path
   - Backup /opt/apps/projects/virazul
   - Git pull origin main
   - Docker-compose build
   - Docker-compose up -d
   - Sleep 5s, health check
   - Se health OK: operação.status = success
   - Se falhar: restore backup, operação.status = failed
```

**Resultado**: Deploy end-to-end automático.

### **FASE 6** — Env Manager (MÉDIA) — **2 semanas**

Gerenciar `.env` com segurança.

**Tasks**:
1. Criar `project-env.service.js`:
   - `readEnv(projectPath)` — retornar mascarado
   - `updateEnv(projectPath, vars)` — salvar com backup
   - `validateEnvKey(key)` — validar formato
2. Criar controller + routes
3. Auditoria de mudanças
4. Testes

**Resultado**: `.env` gerenciável via painel com segurança.

### **FASE 7** — Nginx Manager (MÉDIA) — **2-3 semanas**

Gerenciar domínios dinamicamente.

**Tasks**:
1. Criar `nginx.service.js`:
   - `createServerBlock(domain, projectPath, port)`
   - `updateServerBlock(domain, config)`
   - `deleteServerBlock(domain)`
   - `validateDomain(domain)`
   - `testConfig()` (nginx -t)
   - `reload()` (nginx -s reload)
2. Controller + routes
3. Integração com projetos (adicionar domain ao projeto)
4. Testes

**Resultado**: Domínios criados via painel.

### **FASE 8** — SSL/Certbot Manager (MÉDIA) — **2-3 semanas**

Emitir certificados automaticamente.

**Tasks**:
1. Criar `ssl.service.js`:
   - `validateDnsRecord(domain)`
   - `issueCertificate(domain, email)`
   - `renewCertificate(domain)`
   - `getCertificateExpiry(domain)`
2. Integrar com Nginx (incluir cert paths)
3. Cron job para renovação automática
4. Controller + routes
5. Testes

**Resultado**: SSL automático, sem script manual.

### **FASE 9** — Backup Manager (MÉDIA) — **2 semanas**

Backup e restore de projetos.

**Tasks**:
1. Criar `backup.service.js`:
   - `backupProject(projectPath)` (tar.gz /opt/apps/projects/X)
   - `backupDatabase(projectId)` (mysqldump)
   - `backupEnv(projectPath)` (cópia de .env)
   - `restoreProject(backupPath, projectPath)`
   - `listBackups(projectId)`
   - `deleteBackup(backupId)`
2. Storage (local /opt/backups ou S3)
3. Política de retenção (ex: últimos 10 backups, 30 dias)
4. Controller + routes
5. Testes

**Resultado**: Backup automático + restore via painel.

### **FASE 10** — Worker Expansion (MÉDIO) — **1-2 semanas**

Expandir queue para operações adicionais.

**Tasks**:
1. Criar processors para:
   - Build (docker-compose build)
   - Backup (backup.service.js)
   - SSL renewal (cron)
   - Health checks (scheduled)
2. Retry logic robusto (exponential backoff)
3. DLQ para jobs falhados
4. Monitoring de jobs
5. Testes

**Resultado**: Queue confiável para todas operações longas.

### **FASE 11** — UX Final (DEPOIS) — **2-3 semanas**

Melhorar frontend.

**Tasks**:
1. Wizard de projeto (step-by-step setup)
2. Página detalhada por projeto (real-time logs, status)
3. Operações por botão (Deploy, Rollback, Health Check, Backup)
4. Logs em tempo real (WebSocket)
5. Dashboard executivo (stats, health, recent deploys)

**Resultado**: UX production-ready.

### **FASE 12** — SaaS Comercial (DEPOIS) — **2-4 semanas**

Planos, limites, monetização.

**Tasks**:
1. Limites por plano (projetos, deploys/mês, storage)
2. Metering (contar deploys, storage usado)
3. Integração com payment (Stripe, etc)
4. Billing page

**Resultado**: SaaS comercial.

---

## 6. PRIMEIRO PASSO SEGURO 🚀

**Recomendação**: Iniciar pela **FASE 1 — Projects Foundation**.

**Por quê?**:
1. **Fundação**: Tudo depende de Projects serem operacionais
2. **Baixo Risco**: Apenas adicionar colunas ao banco
3. **Validável**: Testes simples
4. **Unblocks Fases Posteriores**: 2, 3, 4, 5 dependem disso

**Escopo Primeira Sprint (1 semana)**:

```
[ ] Migration: Adicionar campos path, repo_url, branch, stack_type, compose_file, domains, soft_delete
[ ] projeto.service.js: Validações fortes (slug, path whitelist, repo_url format)
[ ] projeto.controller.js: Validar tenantId, soft_delete
[ ] Path whitelist service: /opt/apps/projects APENAS
[ ] Tests: CRUD com novo esquema
[ ] Update Frontend: Mostrar novos campos em ProjectsPage
[ ] Deploy: Testar em branch claudE/audit-plagard-architecture-S4Rxu
[ ] Review: Validar sem quebrar rotas existentes
```

**Resultado Esperado**:
- Projetos com path, repo_url, branch, stack_type
- Sem soft delete acidental
- Path validado
- Testes verdes
- Deploy em branch
- Pronto para Fase 2

---

## 7. SUMÁRIO DE GAPS 📝

| Gap | Severidade | Impacto | Esforço |
|-----|-----------|--------|--------|
| Projects Foundation | 🔴 CRÍTICA | Deploy inviável | 2-3 semanas |
| Project Operations | 🔴 CRÍTICA | Sem rastreamento | 2 semanas |
| Git Operations | 🔴 CRÍTICA | Deploy não atualiza código | 3 semanas |
| Path Safety | 🔴 CRÍTICA | Vulnerabilidade | 1 semana |
| Docker Labels | 🔴 CRÍTICA | Isolamento quebrado | 2 semanas |
| Deploy Engine v2 | 🟠 ALTA | Deploy manual | 3 semanas |
| Env Manager | 🟠 ALTA | Não gerencia .env | 2 semanas |
| Nginx Manager | 🟠 ALTA | Domínios manuais | 2-3 semanas |
| SSL Manager | 🟠 ALTA | SSL manual | 2-3 semanas |
| Backup Manager | 🟡 MÉDIA | Sem backup | 2 semanas |
| Worker Expansion | 🟡 MÉDIA | Fila limitada | 1-2 semanas |
| Commercial SaaS | 🟡 MÉDIA | Sem limites | 2-4 semanas |

---

## 8. CONCLUSÃO

**Plagard Orchestrator é um SaaS bem estruturado, mas precisa da camada DevOps para ser operacional.**

- **Problema Central**: Projetos não são unidades operacionais reais
- **Impacto**: Deploy, Git, Docker, Nginx, SSL não integrados
- **Solução**: Seguir Fases 1-10 sequencialmente
- **Timeline**: ~20 semanas até production-ready completo
- **Primeiro Passo**: FASE 1 (Projects Foundation), início imediato

---

*Auditoria realizada em 25/04/2026*  
*Preparado para Claude Agent — Plagard Orchestrator Architecture Sprint*
