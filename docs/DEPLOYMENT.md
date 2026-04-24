# Guia de Deployment - Fase D

## Visão Geral

Este guia cobre o deployment da Plagard Orchestrator em produção com Nginx, SSL/TLS, e Docker.

## Pré-requisitos

- Servidor Linux (Ubuntu 22.04 LTS recomendado)
- Docker >= 20.10
- Docker Compose >= 2.0
- Domínio próprio com DNS configurado
- IP fixo do servidor
- Acesso SSH com permissões sudo
- Espaço em disco: mínimo 20GB

## Arquitetura de Produção

```
Internet
    ↓
┌─────────────────┐
│   Nginx (443)   │  Reverse proxy com SSL/TLS
│   Rate limit    │
│   Gzip, Cache   │
└────────┬────────┘
         ↓
┌─────────────────┐
│ Backend (3000)  │  Node.js Express API
│ Health check    │
└────────┬────────┘
         ↓
     ┌───┴───┐
     ↓       ↓
  MySQL    Redis
 (3306)   (6379)
```

## 1. Preparação do Servidor

### 1.1 Instalar Docker e Docker Compose

```bash
# Atualizar pacotes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker compose version
```

### 1.2 Configurar DNS

Apontar seu domínio para o IP do servidor:

```
orchestrator.example.com  A  192.168.1.100
```

Aguarde propagação (até 48 horas):

```bash
# Verificar DNS
nslookup orchestrator.example.com
dig orchestrator.example.com
```

### 1.3 Preparar Directories

```bash
# Criar estrutura de diretórios
mkdir -p /opt/orchestrator/{nginx,certbot,logs/{nginx,backend}}
chmod 755 /opt/orchestrator
cd /opt/orchestrator

# Criar arquivo de permissões
mkdir -p /etc/letsencrypt
sudo chown -R $USER:$USER /opt/orchestrator
```

## 2. Clonar e Configurar Projeto

```bash
# Clonar repositório
git clone https://github.com/w-jardim/orchestrator.git .

# Checkout branch de produção
git checkout consolidacao-phase-c

# Criar arquivo .env para produção
cp .env.production .env
```

### 2.1 Configurar Variáveis de Ambiente

Editar `.env`:

```bash
nano .env
```

**Variáveis críticas a mudar:**

```env
# JWT
JWT_ACCESS_SECRET=seu-secret-aleatorio-muito-longo-32-chars-minimo

# Banco de dados
DB_PASS=sua-senha-strong-banco-de-dados
MYSQL_ROOT_PASSWORD=sua-senha-root-muito-forte

# Redis
REDIS_PASS=sua-senha-redis-muito-forte

# Domínios
ALLOWED_ORIGINS=https://orchestrator.example.com

# Emails
DEFAULT_TENANT_NAME=Seu Nome Aqui
```

Gerar secrets seguros:

```bash
# Gerar string aleatória de 32 caracteres
openssl rand -base64 32
```

### 2.2 Validar Configuração

```bash
npm run validate:env
```

## 3. Deploy Inicial

### 3.1 Iniciar Services

```bash
# Iniciar todos os containers em background
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.prod.yml logs -f backend
```

Esperado:
```
orchestrator-mysql     ✓ (healthy)
orchestrator-redis     ✓ (healthy)
orchestrator-backend   ✓ (healthy)
orchestrator-nginx     ✓ (healthy)
```

### 3.2 Verificar Conectividade

```bash
# Backend está rodando?
curl -v http://localhost:3000/health

# Nginx está rodando?
curl -v http://localhost/health
```

## 4. Configurar SSL/TLS

### 4.1 Obter Certificado Let's Encrypt

```bash
# Executar script setup-ssl.sh
chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh orchestrator.example.com admin@example.com
```

O script automaticamente:
- Valida o domínio
- Solicita certificado com Certbot
- Atualiza Nginx
- Recarrega configuração
- Inicia renovação automática

### 4.2 Verificar Certificado

```bash
# HTTPS funciona?
curl -v https://orchestrator.example.com/health

# Ver detalhes do certificado
echo | openssl s_client -servername orchestrator.example.com \
  -connect orchestrator.example.com:443 2>/dev/null | openssl x509 -text

# Ver validade
sudo certbot certificates
```

## 5. Monitoramento e Manutenção

### 5.1 Verificar Health Status

```bash
# Health check do backend
curl https://orchestrator.example.com/health

# Logs em tempo real
docker compose -f docker-compose.prod.yml logs -f --tail=100

# Status dos containers
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

### 5.2 Backups

Criar backup diário do banco:

```bash
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker compose -f docker-compose.prod.yml exec -T mysql \
  mysqldump -u orchestrator -p$DB_PASS plagard_orchestrator \
  > $BACKUP_DIR/backup_$DATE.sql

# Manter apenas últimos 7 dias
find $BACKUP_DIR -type f -mtime +7 -delete
```

Adicionar ao crontab:

```bash
crontab -e

# Backup diário às 2:00 AM
0 2 * * * /opt/orchestrator/scripts/backup.sh
```

### 5.3 Renovação Automática de SSL

Certbot está configurado para renovar automaticamente (a cada 12 horas).

Verificar renovação:

```bash
# Teste seco (não renova)
sudo certbot renew --dry-run

# Forçar renovação (se necessário)
sudo certbot renew --force-renewal
```

## 6. Troubleshooting

### Porta 443 não responde

```bash
# Verificar firewall
sudo ufw status
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Verificar processo Nginx
docker compose -f docker-compose.prod.yml logs nginx

# Verificar certificado
ls -la /etc/letsencrypt/live/
```

### Backend não conecta ao MySQL

```bash
# Verificar container MySQL
docker compose -f docker-compose.prod.yml logs mysql

# Testar conexão
docker compose -f docker-compose.prod.yml exec backend \
  mysql -h mysql -u orchestrator -p -e "SELECT 1;"

# Verificar variáveis de ambiente
docker compose -f docker-compose.prod.yml exec backend env | grep DB_
```

### Redis não conecta

```bash
# Verificar Redis
docker compose -f docker-compose.prod.yml logs redis

# Testar conexão
docker compose -f docker-compose.prod.yml exec redis \
  redis-cli -a $REDIS_PASS ping
```

### Certificado SSL expirado

```bash
# Renovar imediatamente
docker compose -f docker-compose.prod.yml exec certbot \
  certbot renew --force-renewal

# Ou reiniciar container certbot
docker compose -f docker-compose.prod.yml restart certbot
```

## 7. Performance e Segurança

### 7.1 Otimizações Nginx

Já implementado em `nginx/nginx.conf`:
- ✅ Compressão Gzip (reduz 70% do traffic)
- ✅ Cache de assets estáticos (30 dias)
- ✅ Rate limiting (100 req/min geral, 50 Docker ops/min)
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Connection pooling (keepalive)

### 7.2 Security Headers

Verificados:

```bash
curl -I https://orchestrator.example.com

# Verificar headers
curl -I https://orchestrator.example.com | grep -i "strict\|x-content\|x-frame\|csp"
```

## 8. Escalabilidade

### Adicionar mais réplicas do backend

Editar `docker-compose.prod.yml`:

```yaml
services:
  backend:
    deploy:
      replicas: 3
```

Nginx distribui com `least_conn`.

## 9. Logs e Monitoramento

### Ver logs

```bash
# Nginx
tail -f logs/nginx/access.log
tail -f logs/nginx/error.log

# Backend
docker compose -f docker-compose.prod.yml logs -f backend

# MySQL
docker compose -f docker-compose.prod.yml logs -f mysql

# Redis
docker compose -f docker-compose.prod.yml logs -f redis
```

### Centralizar logs (opcional)

Com ELK Stack, Datadog, ou similar:

```bash
docker volume create log-aggregation
# Configurar container de logging
```

## 10. Updates e Rollback

### Fazer Update

```bash
# Parar containers
docker compose -f docker-compose.prod.yml down

# Puxar latest changes
git pull origin consolidacao-phase-c

# Rebuild e start
docker compose -f docker-compose.prod.yml up -d --build

# Verificar
curl https://orchestrator.example.com/health
```

### Rollback

```bash
# Voltar a commit anterior
git revert HEAD --no-edit

# Rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

## Checklist de Deploy

- [ ] Servidor com Docker instalado
- [ ] Domínio configurado no DNS
- [ ] Repositório clonado
- [ ] `.env` configurado com valores production
- [ ] `npm run validate:env` passou
- [ ] Containers inicializados com sucesso
- [ ] Health check respondendo (HTTP)
- [ ] Certificado SSL obtido
- [ ] HTTPS funciona (certificado válido)
- [ ] Logs sem erros críticos
- [ ] Backup configurado
- [ ] Monitoramento em lugar
- [ ] Firewall configurado
- [ ] SSH seguro (sem password)

## Próximas Etapas

1. **Monitoramento**: Configurar alerts (Datadog, New Relic)
2. **CI/CD**: Integrar com GitHub Actions para auto-deploy
3. **CDN**: CloudFlare ou Akamai para static assets
4. **Load Balancer**: HAProxy para múltiplos servidores
5. **Clustering**: Kubernetes para escalabilidade

## Suporte

Problemas?
- Documentação: [ENVIRONMENT.md](./ENVIRONMENT.md), [SERVICES.md](./SERVICES.md)
- Issues: https://github.com/w-jardim/orchestrator/issues
- Email: support@example.com
