# Configuração de Variáveis de Ambiente

## Visão Geral

Este documento descreve todas as variáveis de ambiente necessárias para executar a Plagard Orchestrator.

## Configuração Rápida

1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Atualize os valores conforme necessário para seu ambiente

3. Na inicialização, o sistema valida automaticamente todas as variáveis

## Variáveis Obrigatórias

| Variável | Descrição | Validação |
|----------|-----------|-----------|
| `JWT_ACCESS_SECRET` | Chave secreta para assinar JWTs | Mínimo 32 caracteres |
| `DB_USER` | Usuário do MySQL | String não vazia |
| `DB_PASS` | Senha do MySQL | String não vazia |

## Variáveis de Aplicação

### APP
- **NODE_ENV** (padrão: `development`)
  - Ambiente de execução: `development`, `staging`, `production`
  - Controla comportamento geral da aplicação

- **PORT** (padrão: `3000`)
  - Porta HTTP do servidor
  - Deve estar entre 1024 e 65535

- **LOG_LEVEL** (padrão: `info`)
  - Nível de detalhamento dos logs
  - Valores: `debug`, `info`, `warn`, `error`

### JWT
- **JWT_ACCESS_SECRET**
  - Chave secreta para assinar tokens JWT
  - ⚠️ Deve ter mínimo 32 caracteres em produção
  - Deve ser alterada em cada ambiente

- **JWT_ACCESS_EXPIRES** (padrão: `15m`)
  - Tempo de expiração dos access tokens
  - Formato: `15m`, `1h`, `7d`, etc.

## Variáveis de Banco de Dados

### MySQL
- **DB_HOST** (padrão: `localhost`)
  - Host do servidor MySQL
  - Em Docker: `mysql`

- **DB_PORT** (padrão: `3306`)
  - Porta do MySQL

- **DB_USER** (obrigatório)
  - Usuário do MySQL

- **DB_PASS** (obrigatório)
  - Senha do MySQL

- **DB_NAME** (padrão: `plagard_orchestrator`)
  - Nome do banco de dados

### Redis
- **REDIS_HOST** (padrão: `localhost`)
  - Host do Redis
  - Em Docker: `redis`

- **REDIS_PORT** (padrão: `6379`)
  - Porta do Redis

- **REDIS_PASS** (padrão: vazio)
  - Senha do Redis (opcional)

## Variáveis de Segurança

### CORS
- **ALLOWED_ORIGINS** (padrão: `http://localhost:3000`)
  - Origens permitidas para CORS
  - Formato: URLs separadas por vírgula
  - Ex: `http://localhost:3000,http://localhost:3001,https://app.example.com`

## Variáveis de Tenant

- **DEFAULT_TENANT_NAME** (padrão: `Default Tenant`)
  - Nome do tenant padrão criado na inicialização

- **DEFAULT_TENANT_SLUG** (padrão: `default`)
  - Slug único do tenant padrão
  - Só aceita: `a-z`, `0-9`, hífen

- **DEFAULT_TENANT_PLAN** (padrão: `FREE`)
  - Plano padrão do tenant
  - Valores: `FREE`, `PRO`, `ENTERPRISE`

## Variáveis de Docker

### Timeouts
- **DOCKER_TIMEOUT_MS** (padrão: `5000`)
  - Timeout geral para operações Docker (ms)

- **DOCKER_BUILD_TIMEOUT_MS** (padrão: `120000`)
  - Timeout para build de imagens (2 minutos)

- **DOCKER_RUN_TIMEOUT_MS** (padrão: `30000`)
  - Timeout para execução de containers (30 segundos)

### Retry
- **DOCKER_RETRY_COUNT** (padrão: `2`)
  - Número de tentativas para falhas Docker

- **DOCKER_RETRY_DELAY_MS** (padrão: `1000`)
  - Delay entre tentativas (ms)

### Whitelist
- **DOCKER_ALLOWED_CONTAINERS** (padrão: `all`)
  - Containers permitidos (ex: `*`)
  - `all` permite qualquer container

- **DOCKER_ALLOWED_IMAGES** (padrão: `all`)
  - Imagens permitidas (ex: `ubuntu:*,node:*`)
  - `all` permite qualquer imagem

## Variáveis de Rate Limiting

- **RATE_LIMIT_WINDOW_MS** (padrão: `60000`)
  - Janela de tempo para rate limit geral (ms)

- **RATE_LIMIT_MAX** (padrão: `100`)
  - Máximo de requisições por janela

- **DOCKER_RATE_LIMIT_WINDOW_MS** (padrão: `60000`)
  - Janela de time para rate limit Docker (ms)

- **DOCKER_RATE_LIMIT_MAX** (padrão: `50`)
  - Máximo de operações Docker por janela

## Variáveis de Deployment

- **DEPLOY_FAILED_RETENTION_HOURS** (padrão: `168`)
  - Tempo de retenção de deploys falhados (horas, 1 semana)

- **DEPLOY_MAX_ENV_VARS** (padrão: `50`)
  - Número máximo de variáveis de ambiente por deploy

## Variáveis de Worker

- **WORKER_HEARTBEAT_KEY** (padrão: `worker:heartbeat`)
  - Chave Redis para heartbeat do worker

- **WORKER_HEARTBEAT_TTL_MS** (padrão: `30000`)
  - TTL do heartbeat no Redis (ms, 30 segundos)

## Exemplos de Configuração

### Development
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

JWT_ACCESS_SECRET=dev-secret-32-char-minimum-here
JWT_ACCESS_EXPIRES=15m

DB_HOST=localhost
DB_PORT=3306
DB_USER=orchestrator
DB_PASS=dev_password

REDIS_HOST=localhost
REDIS_PORT=6379

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Production
```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info

JWT_ACCESS_SECRET=prod-secret-min-32-chars-strong-random
JWT_ACCESS_EXPIRES=15m

DB_HOST=db.example.com
DB_PORT=3306
DB_USER=produser
DB_PASS=very_strong_password

REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASS=redis_password

ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com

DOCKER_TIMEOUT_MS=10000
DOCKER_RETRY_COUNT=3
```

## Validação

O sistema valida automaticamente as variáveis ao iniciar:

```javascript
const config = require('./config/environment');
```

Se houver erro de validação, o servidor:
1. Exibe erro detalhado no console
2. Sai com código de erro (exit 1)

## Dicas de Segurança

⚠️ **Nunca commit `.env` ao git** - use `.gitignore`:
```
.env
.env.local
.env.*.local
```

✅ **Sempre** commit `.env.example` com valores padrão seguros

✅ Use senhas diferentes em cada ambiente

✅ Rotacione `JWT_ACCESS_SECRET` regularmente em produção

✅ Use variáveis de ambiente para secrets, nunca hardcode

## Troubleshooting

### "Required env var missing: XXX"
- Copie `.env.example` para `.env`
- Preencha todas as variáveis obrigatórias

### "Invalid value for XXX"
- Verifique o tipo e formato esperado
- Consulte a tabela de validação acima

### Porta já em uso
- Altere `PORT` para outra disponível
- Ou mate o processo usando a porta:
  ```bash
  lsof -i :3000  # Linux/Mac
  netstat -ano | findstr :3000  # Windows
  ```
