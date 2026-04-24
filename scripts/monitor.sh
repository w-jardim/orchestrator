#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.prod.yml"
URL="https://orchestrator.example.com"

clear_screen() {
    clear
}

show_header() {
    clear_screen
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}        🚀 Orchestrator Production Monitor${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
}

check_container_status() {
    echo -e "${YELLOW}📦 Container Status:${NC}"
    docker compose -f $COMPOSE_FILE ps --format "table {{.Names}}\t{{.Status}}"
    echo ""
}

check_health() {
    echo -e "${YELLOW}❤️  Health Checks:${NC}"

    # Backend health
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health | grep -q "200"; then
        echo -e "${GREEN}✓ Backend (HTTP)${NC}"
    else
        echo -e "${RED}✗ Backend (HTTP)${NC}"
    fi

    # HTTPS health
    if curl -s -k -o /dev/null -w "%{http_code}" https://orchestrator.example.com/health | grep -q "200"; then
        echo -e "${GREEN}✓ Backend (HTTPS)${NC}"
    else
        echo -e "${RED}✗ Backend (HTTPS)${NC}"
    fi

    # Database
    if docker compose -f $COMPOSE_FILE exec -T mysql mysqladmin ping -h localhost -u orchestrator -p$DB_PASS &>/dev/null; then
        echo -e "${GREEN}✓ MySQL Database${NC}"
    else
        echo -e "${RED}✗ MySQL Database${NC}"
    fi

    # Redis
    if docker compose -f $COMPOSE_FILE exec -T redis redis-cli -a $REDIS_PASS ping | grep -q PONG; then
        echo -e "${GREEN}✓ Redis Cache${NC}"
    else
        echo -e "${RED}✗ Redis Cache${NC}"
    fi

    echo ""
}

check_disk_usage() {
    echo -e "${YELLOW}💾 Disk Usage:${NC}"
    df -h | head -n 2
    echo ""
}

check_memory() {
    echo -e "${YELLOW}🧠 Memory Usage:${NC}"
    docker compose -f $COMPOSE_FILE stats --no-stream --format "table {{.Container}}\t{{.MemUsage}}\t{{.MemPerc}}"
    echo ""
}

check_certificates() {
    echo -e "${YELLOW}🔐 SSL Certificates:${NC}"

    if sudo certbot certificates 2>/dev/null | grep -q "orchestrator"; then
        EXPIRY=$(sudo certbot certificates 2>/dev/null | grep "Expiry Date" | head -1 | awk -F': ' '{print $2}')
        echo -e "${GREEN}✓ Certificate active (expires: ${EXPIRY})${NC}"
    else
        echo -e "${RED}✗ No certificates found${NC}"
    fi
    echo ""
}

check_logs() {
    echo -e "${YELLOW}📋 Recent Errors (last 10 minutes):${NC}"
    LOGS=$(docker compose -f $COMPOSE_FILE logs --since 10m backend | grep -i "error\|exception\|fail" || true)
    if [ -z "$LOGS" ]; then
        echo -e "${GREEN}✓ No recent errors${NC}"
    else
        echo -e "${RED}⚠️  Found errors:${NC}"
        echo "$LOGS" | tail -5
    fi
    echo ""
}

show_quick_commands() {
    echo -e "${YELLOW}📝 Quick Commands:${NC}"
    echo "  View logs:       docker compose -f $COMPOSE_FILE logs -f backend"
    echo "  Restart:         docker compose -f $COMPOSE_FILE restart"
    echo "  Stop:            docker compose -f $COMPOSE_FILE down"
    echo "  Update:          git pull && docker compose -f $COMPOSE_FILE up -d --build"
    echo "  Backup:          scripts/backup.sh"
    echo ""
}

# Main loop
while true; do
    show_header
    check_container_status
    check_health
    check_disk_usage
    check_memory
    check_certificates
    check_logs
    show_quick_commands

    echo -e "${YELLOW}Press Ctrl+C to exit, or refresh in 10 seconds...${NC}"
    sleep 10
done
