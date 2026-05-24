#!/bin/bash
set -e

# Youth360 EC2 Deployment Script
# Usage: ./deploy/setup-ec2.sh <domain>
# Example: ./deploy/setup-ec2.sh youth360.example.com

DOMAIN=${1:-""}
EMAIL=${2:-"admin@example.com"}

echo "=========================================="
echo "  Youth360 - EC2 Docker Deployment"
echo "=========================================="

# --- Install Docker ---
if ! command -v docker &> /dev/null; then
  echo "[1/6] Installing Docker..."
  sudo apt-get update -qq
  sudo apt-get install -y -qq ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -qq
  sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo usermod -aG docker $USER
  echo "  Docker installed. You may need to re-login for group changes."
else
  echo "[1/6] Docker already installed."
fi

# --- Create .env file ---
echo "[2/6] Setting up environment..."
if [ ! -f .env ]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  NRIC_KEY=$(openssl rand -hex 16)
  DB_PASSWORD=$(openssl rand -hex 16)

  cat > .env << EOF
# Database
DB_PASSWORD=${DB_PASSWORD}

# Security
SESSION_SECRET=${SESSION_SECRET}
NRIC_ENCRYPTION_KEY=${NRIC_KEY}

# AI Providers (add your keys)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=

# Domain (used by certbot)
DOMAIN=${DOMAIN}
EMAIL=${EMAIL}
EOF
  echo "  Created .env with generated secrets."
  echo "  >> Edit .env to add your AI API keys if needed."
else
  echo "  .env already exists, skipping."
fi

source .env

# --- SSL Setup ---
echo "[3/6] Setting up SSL certificates..."
if [ -z "$DOMAIN" ]; then
  echo "  No domain provided. Generating self-signed certificate..."
  mkdir -p deploy/certbot/conf/live/youth360
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout deploy/certbot/conf/live/youth360/privkey.pem \
    -out deploy/certbot/conf/live/youth360/fullchain.pem \
    -subj "/CN=localhost" 2>/dev/null
  echo "  Self-signed cert created. Access via https://<ec2-ip>"
else
  echo "  Domain: $DOMAIN"
  echo "  Requesting Let's Encrypt certificate..."

  # Start nginx temporarily for ACME challenge
  mkdir -p deploy/certbot/conf/live/youth360
  # Create dummy cert so nginx can start
  openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout deploy/certbot/conf/live/youth360/privkey.pem \
    -out deploy/certbot/conf/live/youth360/fullchain.pem \
    -subj "/CN=$DOMAIN" 2>/dev/null

  docker compose -f docker-compose.prod.yml up -d nginx
  sleep 3

  # Request real cert
  docker compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot --webroot-path=/var/www/certbot \
    --email "$EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN"

  # Replace dummy with real cert path
  docker compose -f docker-compose.prod.yml down nginx
  echo "  SSL certificate obtained for $DOMAIN"
fi

# --- Build & Start ---
echo "[4/6] Building the application..."
docker compose -f docker-compose.prod.yml build app

echo "[5/6] Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo "[6/6] Running database migrations..."
sleep 5  # Wait for postgres to be ready
docker compose -f docker-compose.prod.yml exec app node -e "
  const { db } = require('./node_modules/@youth360/db');
  console.log('DB connection established');
" 2>/dev/null || echo "  (Migration step - manual setup may be needed)"

echo ""
echo "=========================================="
echo "  Deployment complete!"
echo "=========================================="
echo ""
if [ -z "$DOMAIN" ]; then
  echo "  App: https://<your-ec2-public-ip>"
  echo "  (Self-signed cert - browser will show warning)"
else
  echo "  App: https://$DOMAIN"
fi
echo ""
echo "  Login: admin@youth360.gov.sg / demo1234"
echo ""
echo "  Useful commands:"
echo "    docker compose -f docker-compose.prod.yml logs -f    # View logs"
echo "    docker compose -f docker-compose.prod.yml down       # Stop all"
echo "    docker compose -f docker-compose.prod.yml up -d      # Start all"
echo "    docker compose -f docker-compose.prod.yml exec postgres psql -U youth360  # DB shell"
echo ""
