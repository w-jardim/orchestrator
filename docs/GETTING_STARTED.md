# Guia de Início Rápido

## Pré-requisitos

- Node.js >= 20.0.0
- npm >= 10.0.0
- MySQL >= 8.0 (ou MariaDB)
- Redis >= 6.0
- Docker (opcional, para testes)

## Instalação

### 1. Clonar Repositório
```bash
git clone https://github.com/w-jardim/orchestrator.git
cd orchestrator
```

### 2. Instalar Dependências
```bash
npm install
```

Isso instala dependências para todos os workspaces:
- `core` - Código compartilhado
- `integrations` - Integrações externas
- `backend` - API Express
- `worker` - Background jobs

### 3. Configurar Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações
nano .env  # ou use seu editor favorito
```

### 4. Validar Configuração

```bash
npm run validate:env
```

Saída esperada:
```
✅ All environment variables are valid!
```

## Executando os Serviços

### Opção 1: Services Locais (MySQL + Redis no localhost)

**Terminal 1 - MySQL**
```bash
# Windows
mysql -u root -p < setup.sql

# Linux/Mac
mysql -u root -p < setup.sql
```

**Terminal 2 - Redis**
```bash
# Windows (com WSL)
redis-server

# Linux
redis-server

# Mac (com Homebrew)
brew services start redis
```

**Terminal 3 - Backend**
```bash
npm run dev:backend
```

O backend estará disponível em: `http://localhost:3000`

### Opção 2: Com Docker Compose (Recomendado)

```bash
# Iniciar todos os services
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

Services disponíveis:
- Backend: `http://localhost:3000`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

### Opção 3: Desenvolvimento com Frontend React

**Terminal 1 - Backend**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend (em outro terminal/diretório)**
```bash
cd frontend
npm install
npm run dev
```

Frontend estará disponível em: `http://localhost:5173` ou `http://localhost:3001`

## Primeiros Passos

### 1. Verificar Health Check
```bash
curl http://localhost:3000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "uptime": 45,
  "database": "connected",
  "redis": "connected"
}
```

### 2. Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Resposta (salvar o token):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "ADMIN_MASTER"
    }
  }
}
```

### 3. Listar Projetos
```bash
curl -X GET http://localhost:3000/api/v1/projetos \
  -H "Authorization: Bearer eyJhbGc..."
```

## Verificação de Conectividade

### Database
```bash
# Test MySQL connection
npm run validate:env

# MySQL CLI
mysql -h localhost -u orchestrator -p
```

### Redis
```bash
# Test Redis connection
redis-cli ping
# Resposta: PONG
```

### Backend API
```bash
# Health check
curl http://localhost:3000/health

# Com verbose
curl -v http://localhost:3000/health
```

## Troubleshooting

### "Port already in use"
```bash
# Encontrar processo usando porta
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Matar processo (ajuste PID)
kill -9 <PID>
```

### "Cannot connect to MySQL"
```bash
# Verificar se MySQL está rodando
systemctl status mysql  # Linux
brew services list      # Mac

# Verificar credenciais
mysql -h localhost -u orchestrator -p

# Criar database se não existir
mysql -u root -p < database/migrations/001_init.sql
```

### "Cannot connect to Redis"
```bash
# Verificar se Redis está rodando
redis-cli ping

# Iniciar Redis
redis-server

# Mac com Homebrew
brew services start redis
```

### "JWT_ACCESS_SECRET is invalid"
Editar `.env` e garantir que `JWT_ACCESS_SECRET` tem mínimo 32 caracteres:
```env
JWT_ACCESS_SECRET=seu-secret-muito-longo-com-32-caracteres-minimo
```

### "Rate limit exceeded"
Aguardar 1 minuto ou ajustar em `.env`:
```env
RATE_LIMIT_MAX=200
```

## Scripts Úteis

### Validação
```bash
npm run validate:env      # Validar variáveis de ambiente
npm run lint              # Linting (se configurado)
```

### Desenvolvimento
```bash
npm run dev:backend       # Backend com hot reload
npm run dev:worker        # Worker com hot reload
```

### Produção
```bash
npm run start:backend     # Backend (produção)
npm run start:worker      # Worker (produção)
```

## Estrutura de Diretórios

```
orchestrator/
├── backend/                    # API Express
│   ├── src/
│   │   ├── routes/            # Rotas da API
│   │   ├── controllers/       # Handlers
│   │   ├── services/          # Lógica de negócio
│   │   ├── middlewares/       # Middlewares Express
│   │   ├── config/            # Configuração
│   │   └── bootstrap/         # Inicialização
│   └── package.json
├── core/                       # Código compartilhado
├── integrations/               # Integrações externas
├── worker/                     # Background jobs
├── frontend/                   # React app (se existir)
├── database/                   # Migrations SQL
├── docs/                       # Documentação
├── scripts/                    # Scripts utilitários
├── .env                        # Variáveis de ambiente
├── .env.example               # Template
└── package.json               # Root workspace
```

## Próximos Passos

1. **Revisar Documentação**
   - [ENVIRONMENT.md](./ENVIRONMENT.md) - Variáveis de ambiente
   - [SERVICES.md](./SERVICES.md) - Endpoints e API

2. **Explorar a API**
   - [Postman Collection](./postman-collection.json) - Importar no Postman
   - ou usar `curl` / `httpie` para testes

3. **Desenvolver Features**
   - Criar branches feature: `git checkout -b feat/feature-name`
   - Commits em português
   - Push e criar PR

## Dúvidas Frequentes

**P: Como reset do database?**
```bash
# Dropar e recriar database
mysql -u root -p -e "DROP DATABASE plagard_orchestrator;"
mysql -u root -p < database/migrations/001_init.sql
```

**P: Como gerar um novo JWT token?**
```bash
# Via API
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

**P: Como adicionar nova variável de ambiente?**
1. Adicionar em `.env.example`
2. Adicionar schema em `backend/src/config/environment.js`
3. Documentar em `docs/ENVIRONMENT.md`
4. Adicionar em `.env` com valor apropriado

**P: Como testar um endpoint?**
```bash
# Com curl
curl -X GET http://localhost:3000/api/v1/projetos \
  -H "Authorization: Bearer <token>"

# Com httpie
http GET localhost:3000/api/v1/projetos "Authorization: Bearer <token>"

# Com Postman
# Importar collection e configurar environment
```

## Suporte

Encontrou um problema? Abra uma issue no GitHub:
https://github.com/w-jardim/orchestrator/issues
