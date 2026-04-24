# Frontend - Guia de Integração

## Visão Geral

Frontend React + TypeScript com integração completa aos 38 endpoints da Plagard Orchestrator.

## Arquitetura

```
frontend/
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── auth/         # Autenticação
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── layout/       # Layout (Sidebar, Topbar)
│   │   └── ui/           # UI base (Button, Card, Badge, etc)
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts    # Autenticação
│   │   ├── useProjects.ts # Gerenciar projetos
│   │   ├── useContainers.ts # Containers
│   │   └── ...           # Outros hooks
│   ├── pages/            # Páginas/Routes
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── UsersPage.tsx
│   │   ├── ContainersPage.tsx
│   │   └── ...
│   ├── services/         # API client
│   │   ├── api.ts        # Todos os 38 endpoints
│   │   ├── auth.service.ts
│   │   └── ...
│   ├── App.tsx           # Routing
│   └── main.tsx          # Entry point
├── .env.development      # Dev config
├── .env.production       # Prod config
├── vite.config.ts        # Build config
└── package.json
```

## Instalação

```bash
cd frontend
npm install
```

## Desenvolvimento

### Iniciar servidor de desenvolvimento

```bash
npm run dev
```

Acesso em: `http://localhost:5173`

### Compilar para produção

```bash
npm run build
```

Saída em: `dist/`

## Configuração

### Variáveis de Ambiente

**Development** (`.env.development`):
```env
VITE_API_URL=http://localhost:3000
```

**Production** (`.env.production`):
```env
VITE_API_URL=https://orchestrator.example.com
```

## API Client

### Instância única

```typescript
import { apiClient } from '../services/api'
```

### Métodos disponíveis

#### Autenticação
```typescript
apiClient.login(email, password)
apiClient.logout()
apiClient.getMe()
apiClient.refreshToken()
```

#### Projetos (38 endpoints total)
```typescript
// CRUD
apiClient.listProjects(page, limit)
apiClient.createProject(data)
apiClient.getProject(id)
apiClient.updateProject(id, data)
apiClient.deleteProject(id)

// Operações
apiClient.getProjectStatus(id)
```

#### Containers Docker
```typescript
apiClient.listContainers(all)
apiClient.getContainer(id)
apiClient.startContainer(id, timeout)
apiClient.stopContainer(id, timeout)
apiClient.restartContainer(id, timeout)
apiClient.getContainerLogs(id, tail, timestamps)
apiClient.removeContainer(id, force, removeVolumes)
```

#### Imagens Docker
```typescript
apiClient.listImages()
apiClient.getImage(id)
apiClient.pullImage(image)
apiClient.deleteImage(id, force)
```

#### Git Credentials
```typescript
apiClient.listGitKeys()
apiClient.generateGitKey(name, comment)
apiClient.addGitKey(name, privateKey, publicKey)
apiClient.deleteGitKey(name)
apiClient.getGitKeyFingerprint(name)
apiClient.testGitAuth(repositoryUrl)
apiClient.configureGit(name, email)
```

#### Usuários
```typescript
apiClient.listUsers(page, limit)
apiClient.createUser(data)
apiClient.getUser(id)
apiClient.updateUser(id, data)
apiClient.deleteUser(id)
apiClient.changeUserRole(id, role)
apiClient.changeUserStatus(id, status)
apiClient.changeUserPassword(id, password)
```

#### Tenants (ADMIN_MASTER)
```typescript
apiClient.listTenants(page, limit)
apiClient.createTenant(data)
apiClient.getTenant(id)
apiClient.updateTenant(id, data)
apiClient.deleteTenant(id)
```

## Custom Hooks

### useAuth
```typescript
import { useAuth } from '../hooks/useAuth'

const { user, isAuthenticated, login, logout, loading } = useAuth()
```

### useProjects
```typescript
import { useProjects } from '../hooks/useProjects'

const {
  projects,
  stats,
  loading,
  error,
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectStatus,
} = useProjects(page, limit)
```

### useContainers
```typescript
import { useContainers } from '../hooks/useContainers'

const { containers, loading, error, refresh } = useContainers()
```

## Componentes

### Button
```typescript
<Button 
  onClick={handleClick}
  className="bg-emerald-600 hover:bg-emerald-700"
>
  Clique aqui
</Button>
```

### Card
```typescript
<Card className="bg-slate-800/50 p-4">
  Conteúdo
</Card>
```

### Badge
```typescript
<Badge label="nodejs" color="green" />
<Badge label="ativo" color="emerald" />
```

### Spinner
```typescript
<Spinner />
```

### ErrorState
```typescript
<ErrorState message="Algo deu errado" />
```

## Páginas Implementadas

### ✅ LoginPage
- Autenticação JWT
- Armazenamento seguro de token
- Redirect automático

### ✅ DashboardPage
- Visão geral operacional
- Health widgets
- Stats rápidas

### ✅ ContainersPage
- Lista de containers
- Start/Stop/Restart
- Visualização de logs
- Remove container

### ✅ DeploysPage
- Histórico de deploys
- Status de deployments
- Logs

### ✅ HealthPage
- Status dos serviços
- Uptime
- Conexões (DB, Redis)

### ✅ ProjectsPage (NEW)
- CRUD de projetos
- Tipos (nodejs, python, docker, etc)
- Status (ativo, pausado)
- Criação de novo projeto

### ✅ UsersPage (NEW)
- CRUD de usuários
- Roles (VIEWER, OPERATOR, ADMIN, ADMIN_MASTER)
- Status
- Gerenciamento de acesso

## Fluxo de Autenticação

1. **Login**
   - Usuario preenche email + password
   - `POST /api/v1/auth/login`
   - Backend retorna JWT token
   - Token armazenado no localStorage

2. **Requisições**
   - Cada request inclui header: `Authorization: Bearer <token>`
   - API client adiciona automaticamente

3. **Token inválido**
   - Response 401/403
   - Token removido do storage
   - Usuário redirecionado para /login

4. **Logout**
   - `POST /api/v1/auth/logout`
   - Token removido do storage
   - Redirect para /login

## Tratamento de Erros

Todos os métodos podem lançar exceções:

```typescript
try {
  const response = await apiClient.login(email, password)
  if (response.success) {
    // Sucesso
  }
} catch (err) {
  // Erro
  console.error(err.message)
}
```

## Performance

### Otimizações incluídas
- ✅ Code splitting (Vite)
- ✅ Lazy loading de rotas
- ✅ Memoização de componentes
- ✅ Caching de requisições
- ✅ Compressão Gzip

### Build produção
```bash
npm run build
```

Tamanho esperado: ~150KB (gzipped)

## Deployment

### Servir no Nginx
```nginx
location / {
  root /var/www/orchestrator/frontend/dist;
  try_files $uri /index.html;
}
```

### Com Docker
```dockerfile
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

## Testes

### Executar testes (quando configurado)
```bash
npm run test
```

### E2E (quando configurado)
```bash
npm run test:e2e
```

## Troubleshooting

### "API não responde"
```bash
# Verificar se backend está rodando
curl http://localhost:3000/health

# Verificar .env.development
cat .env.development

# Verificar logs do browser
F12 > Console
```

### "401 Unauthorized"
- Verificar token no localStorage
- Fazer login novamente
- Validar JWT_ACCESS_SECRET

### "CORS error"
- Verificar ALLOWED_ORIGINS no backend
- Deve incluir http://localhost:3000 para dev

## Roadmap

- [ ] Testes unitários
- [ ] E2E com Cypress
- [ ] Dark mode completo
- [ ] Internacionalização (i18n)
- [ ] PWA (offline support)
- [ ] WebSocket (live updates)

## Estrutura de Pastas Detalhada

```
frontend/src/
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   ├── dashboard/
│   │   ├── ContainersTable.tsx
│   │   ├── DeploysList.tsx
│   │   ├── HealthWidget.tsx
│   │   └── StatCard.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── EmptyState.tsx
│       ├── ErrorState.tsx
│       └── Spinner.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useAuth.tsx
│   ├── useContainers.ts
│   ├── useDeploys.ts
│   ├── useHealth.ts
│   └── useProjects.ts        # NEW
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ContainersPage.tsx
│   ├── DeploysPage.tsx
│   ├── HealthPage.tsx
│   ├── ProjectsPage.tsx      # NEW
│   └── UsersPage.tsx         # NEW
├── services/
│   ├── api.ts               # UPDATED (38 endpoints)
│   ├── auth-storage.ts
│   ├── auth.service.ts
│   ├── containers.service.ts
│   ├── deploys.service.ts
│   └── health.service.ts
├── App.tsx                  # UPDATED (rotas novas)
└── main.tsx
```

## Próximos Passos

1. **Iniciar frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

2. **Login**
   - Email: admin@example.com
   - Password: password123

3. **Testar endpoints**
   - Dashboard
   - Projetos
   - Containers
   - Usuários

4. **Deployment**
   - Build: `npm run build`
   - Deploy para produção

## Suporte

Encontrou um problema?
- Verificar logs do browser (F12)
- Verificar resposta da API (Network tab)
- Abrir issue: https://github.com/w-jardim/orchestrator/issues
