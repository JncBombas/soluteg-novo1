#!/bin/bash

# Script de deploy para o VPS
# Uso: ./deploy-vps.sh

set -e

echo "=========================================="
echo "Soluteg - Deploy para VPS"
echo "=========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
VPS_HOST="129.121.36.243"
VPS_PORT="22022"
VPS_USER="root"
VPS_APP_DIR="/var/www/soluteg/backend"
PM2_PROCESS_NAME="soluteg-sistema"

echo -e "${YELLOW}[1/5] Fazendo push para GitHub...${NC}"
git push origin main || { echo -e "${RED}Erro ao fazer push${NC}"; exit 1; }

echo -e "${YELLOW}[2/5] Conectando ao VPS e atualizando código...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
  set -e
  cd /var/www/soluteg/backend
  
  echo "Atualizando código do GitHub..."
  git pull origin main
  
  echo "Instalando dependências..."
  pnpm install
  
  echo "Compilando TypeScript..."
  pnpm run build
EOF

echo -e "${YELLOW}[3/5] Reiniciando aplicação no VPS...${NC}"
ssh -p $VPS_PORT $VPS_USER@$VPS_HOST << 'EOF'
  set -e
  
  echo "Parando aplicação..."
  pm2 stop soluteg-sistema || true
  
  echo "Reiniciando aplicação..."
  pm2 start soluteg-sistema
  
  echo "Verificando status..."
  pm2 status soluteg-sistema
EOF

echo -e "${YELLOW}[4/5] Verificando saúde da aplicação...${NC}"
sleep 3

# Tentar acessar a aplicação
if curl -s -k https://jnc.soluteg.com.br > /dev/null; then
  echo -e "${GREEN}✓ Aplicação respondendo corretamente${NC}"
else
  echo -e "${RED}✗ Erro ao acessar aplicação${NC}"
  exit 1
fi

echo -e "${GREEN}=========================================="
echo "Deploy concluído com sucesso!"
echo "=========================================${NC}"
echo ""
echo "Aplicação disponível em: https://jnc.soluteg.com.br"
echo ""
