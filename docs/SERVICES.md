# Mapeamento de Serviços e Portas

## Visão Geral

Este documento define todos os serviços, portas e endpoints da Plagard Orchestrator.

## Serviços Principais

### Backend API
- **Serviço**: `orchestrator-backend`
- **Porta**: 3000 (configurável via `PORT`)
- **Protocolo**: HTTP/HTTPS
- **Status**: `/health`

### MySQL Database
- **Serviço**: `mysql` / `mariadb`
- **Porta**: 3306 (configurável via `DB_PORT`)
- **Usuário**: `orchestrator` (configurável via `DB_USER`)
- **Banco**: `plagard_orchestrator` (configurável via `DB_NAME`)

### Redis Cache
- **Serviço**: `redis`
- **Porta**: 6379 (configurável via `REDIS_PORT`)
- **Função**: Caching, Sessions, Job Queue

## Mapeamento de Portas

### Development (localhost)
```
3000  → Backend API
3001  → Frontend (React)
5173  → Frontend Dev Server (Vite)
3306  → MySQL
6379  → Redis
```

### Docker Compose (Services)
```
3000  → Backend API
3306  → MySQL
6379  → Redis
```

### Production
```
80    → Nginx (HTTP redirect)
443   → Nginx (HTTPS)
3000  → Backend API (interno)
3306  → MySQL (interno, não exposto)
6379  → Redis (interno, não exposto)
```

## Endpoints da API

### Health & Status
```
GET  /health                       - Health check endpoint
```

### Autenticação
```
POST /api/v1/auth/login           - Login (email + password)
POST /api/v1/auth/logout          - Logout
POST /api/v1/auth/refresh         - Refresh token
GET  /api/v1/auth/me              - Usuário atual
```

### Tenants (Multi-tenant)
```
GET    /api/v1/tenants            - Listar todos (ADMIN_MASTER only)
POST   /api/v1/tenants            - Criar novo
GET    /api/v1/tenants/:id        - Obter detalhes
PUT    /api/v1/tenants/:id        - Atualizar
DELETE /api/v1/tenants/:id        - Deletar
```

### Usuários
```
GET    /api/v1/users              - Listar usuários (escopo tenant)
POST   /api/v1/users              - Criar novo usuário
GET    /api/v1/users/:id          - Obter detalhes
PUT    /api/v1/users/:id          - Atualizar perfil
DELETE /api/v1/users/:id          - Deletar usuário
PATCH  /api/v1/users/:id/role     - Mudar role
PATCH  /api/v1/users/:id/status   - Mudar status
PATCH  /api/v1/users/:id/password - Mudar senha
```

### Projetos
```
GET    /api/v1/projetos                    - Listar projetos
POST   /api/v1/projetos                    - Criar projeto
GET    /api/v1/projetos/:id                - Obter detalhes
PUT    /api/v1/projetos/:id                - Atualizar
DELETE /api/v1/projetos/:id                - Deletar
GET    /api/v1/projetos/:id/status         - Status do projeto
```

### Ambientes (por Projeto)
```
GET    /api/v1/projetos/:id/ambientes      - Listar ambientes
POST   /api/v1/projetos/:id/ambientes      - Criar ambiente
GET    /api/v1/projetos/:id/ambientes/:envId - Obter detalhes
PUT    /api/v1/projetos/:id/ambientes/:envId - Atualizar
DELETE /api/v1/projetos/:id/ambientes/:envId - Deletar
```

### Componentes (por Projeto)
```
GET    /api/v1/projetos/:id/componentes    - Listar componentes
POST   /api/v1/projetos/:id/componentes    - Criar componente
GET    /api/v1/projetos/:id/componentes/:compId - Obter detalhes
PUT    /api/v1/projetos/:id/componentes/:compId - Atualizar
DELETE /api/v1/projetos/:id/componentes/:compId - Deletar
```

### Docker - Containers
```
GET    /api/v1/docker/containers           - Listar containers
GET    /api/v1/docker/containers/:id       - Inspecionar container
POST   /api/v1/docker/containers/:id/start - Iniciar container
POST   /api/v1/docker/containers/:id/stop  - Parar container
POST   /api/v1/docker/containers/:id/restart - Reiniciar container
GET    /api/v1/docker/containers/:id/logs  - Obter logs
DELETE /api/v1/docker/containers/:id       - Remover container
```

### Docker - Imagens
```
GET    /api/v1/docker/images               - Listar imagens
GET    /api/v1/docker/images/:id           - Inspecionar imagem
POST   /api/v1/docker/images/pull          - Baixar imagem
DELETE /api/v1/docker/images/:id           - Remover imagem
```

### Git Credentials
```
GET    /api/v1/git/credentials              - Listar chaves SSH
POST   /api/v1/git/credentials/generate     - Gerar nova chave
POST   /api/v1/git/credentials/add          - Adicionar chave existente
DELETE /api/v1/git/credentials/:name        - Remover chave
GET    /api/v1/git/credentials/:name/fingerprint - Obter fingerprint
POST   /api/v1/git/credentials/test-auth    - Testar autenticação
POST   /api/v1/git/credentials/configure    - Configurar git global
```

## Autenticação por Endpoint

### Público (sem autenticação)
```
GET  /health
POST /api/v1/auth/login
```

### Requer Autenticação
```
Todos os demais endpoints requerem:
- Header: Authorization: Bearer <token>
```

## Role-Based Access Control (RBAC)

### Permissões por Endpoint

#### VIEWER (Consulta)
```
GET /api/v1/docker/containers
GET /api/v1/docker/containers/:id
GET /api/v1/docker/images
GET /api/v1/docker/images/:id
GET /api/v1/projetos
GET /api/v1/projetos/:id
GET /api/v1/projetos/:id/ambientes
GET /api/v1/projetos/:id/componentes
GET /api/v1/users
```

#### OPERATOR (Operações)
```
(Tudo de VIEWER +)
GET /api/v1/docker/containers/:id/logs
POST /api/v1/docker/containers/:id/start
POST /api/v1/docker/containers/:id/stop
POST /api/v1/docker/containers/:id/restart
```

#### ADMIN (Administração)
```
(Tudo de OPERATOR +)
DELETE /api/v1/docker/containers/:id
POST /api/v1/docker/images/pull
DELETE /api/v1/docker/images/:id
POST /api/v1/projetos
PUT /api/v1/projetos/:id
DELETE /api/v1/projetos/:id
POST /api/v1/projetos/:id/ambientes
PUT /api/v1/projetos/:id/ambientes/:envId
DELETE /api/v1/projetos/:id/ambientes/:envId
POST /api/v1/projetos/:id/componentes
PUT /api/v1/projetos/:id/componentes/:compId
DELETE /api/v1/projetos/:id/componentes/:compId
POST /api/v1/users
PUT /api/v1/users/:id
DELETE /api/v1/users/:id
PATCH /api/v1/users/:id/role
PATCH /api/v1/users/:id/password
/api/v1/git/credentials/* (todas operações)
```

#### ADMIN_MASTER (Super Admin)
```
(Tudo de ADMIN +)
GET /api/v1/tenants
POST /api/v1/tenants
GET /api/v1/tenants/:id
PUT /api/v1/tenants/:id
DELETE /api/v1/tenants/:id
(Gerenciar usuários de todos os tenants)
```

## Rate Limiting

Todos os endpoints estão sujeitos a rate limiting:

- **Geral**: 100 requisições por minuto
- **Docker Operations**: 50 operações por minuto
- **Git Operations**: 30 operações por minuto

## Timeout Padrão

```
Docker Operations:     5 segundos
Docker Build:        120 segundos (2 minutos)
Docker Run:           30 segundos
Git Operations:       10 segundos
API Requests:          5 segundos
```

## Status Codes

```
200 - OK (sucesso)
201 - Created (recurso criado)
204 - No Content (sucesso sem corpo)
400 - Bad Request (entrada inválida)
401 - Unauthorized (autenticação ausente/inválida)
403 - Forbidden (sem permissão)
404 - Not Found (recurso não encontrado)
422 - Unprocessable Entity (validação falhou)
429 - Too Many Requests (rate limit excedido)
500 - Internal Server Error
503 - Service Unavailable
```

## Exemplo de Request

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'

# Listar containers (com token)
curl -X GET http://localhost:3000/api/v1/docker/containers \
  -H "Authorization: Bearer eyJhbGc..."

# Criar projeto
curl -X POST http://localhost:3000/api/v1/projetos \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "nome":"Meu Projeto",
    "descricao":"Descrição",
    "tipo":"nodejs"
  }'
```

## Paginação

Endpoints que listam recursos suportam paginação:

```bash
GET /api/v1/projetos?page=1&limit=10
```

Query Parameters:
- `page`: Número da página (começa em 1)
- `limit`: Itens por página (padrão: 10, máx: 100)

Response:
```json
{
  "success": true,
  "data": [...],
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3
}
```

## Monitoramento

### Health Check
```bash
curl http://localhost:3000/health

# Response
{
  "status": "ok",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected"
}
```

### Logs
Logs são mantidos em `logs/` com rotação automática.

Níveis:
- `debug` - Informações detalhadas de desenvolvimento
- `info` - Eventos normais da aplicação
- `warn` - Possíveis problemas
- `error` - Erros

## Segurança

- Todos os endpoints requerem HTTPS em produção
- JWT tokens têm expiração de 15 minutos
- Senhas são hashadas com bcryptjs (12 rounds)
- Rate limiting previne brute force
- CORS configurável via `ALLOWED_ORIGINS`
- Input validation em todos os endpoints
