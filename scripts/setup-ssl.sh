#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-orchestrator.example.com}"
EMAIL="${2:-admin@example.com}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

echo -e "${YELLOW}🔐 Configurando SSL/TLS com Let's Encrypt${NC}"
echo "Domínio: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

# Check if domain is reachable
echo -e "${YELLOW}✓ Verificando conectividade do domínio...${NC}"
if ! ping -c 1 "${DOMAIN}" &> /dev/null; then
    echo -e "${RED}✗ Erro: ${DOMAIN} não está acessível${NC}"
    echo "  Verifique se o DNS está configurado corretamente"
    exit 1
fi

# Check if Nginx is running
echo -e "${YELLOW}✓ Verificando Nginx...${NC}"
if ! docker ps | grep -q orchestrator-nginx; then
    echo -e "${RED}✗ Erro: Container Nginx não está rodando${NC}"
    echo "  Execute: docker-compose -f docker-compose.prod.yml up -d nginx"
    exit 1
fi

# Create certbot webroot directory
mkdir -p ./certbot/www

# Request certificate
echo -e "${YELLOW}✓ Solicitando certificado Let's Encrypt...${NC}"
docker run --rm \
    -v /etc/letsencrypt:/etc/letsencrypt \
    -v /var/lib/letsencrypt:/var/lib/letsencrypt \
    -v ./certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    -w /var/www/certbot \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    -d "${DOMAIN}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Certificado obtido com sucesso!${NC}"
    echo "  Localização: ${CERT_DIR}"
else
    echo -e "${RED}✗ Erro ao obter certificado${NC}"
    exit 1
fi

# Update Nginx configuration with domain
echo -e "${YELLOW}✓ Atualizando configuração Nginx...${NC}"
sed -i "s/orchestrator.example.com/${DOMAIN}/g" nginx/nginx.conf

# Reload Nginx
echo -e "${YELLOW}✓ Recarregando Nginx...${NC}"
docker exec orchestrator-nginx nginx -s reload

echo ""
echo -e "${GREEN}✅ SSL/TLS configurado com sucesso!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Seu certificado será renovado automaticamente"
echo "2. Verifique: https://${DOMAIN}/health"
echo "3. Configure firewall se necessário (porta 443)"
echo ""
echo "Certificado expira em 90 dias"
echo "Renovação automática está configurada no container certbot"
