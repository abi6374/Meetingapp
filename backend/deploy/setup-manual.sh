#!/bin/bash
# =============================================================================
# MeetingMind — Manual EC2 Setup Script
# =============================================================================
# Run this on a fresh Ubuntu 24.04 EC2 instance after SSH'ing in:
#   ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
#   wget -O- https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/main/backend/deploy/setup-manual.sh | bash
# =============================================================================

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── 1. Configuration ──────────────────────────────────────────────────────────
REPO_URL="${1:-https://github.com/YOUR_USERNAME/YOUR_REPO.git}"
APP_DIR="$HOME/meetingmind"
API_PORT=8000
EC2_IP=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "YOUR_EC2_IP")

# ── 2. System Dependencies ────────────────────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq && sudo apt-get upgrade -y -qq

log "Installing Docker, Nginx, Git, and FFmpeg..."
sudo apt-get install -y -qq \
    apt-transport-https ca-certificates curl software-properties-common \
    git nginx certbot python3-certbot-nginx ufw ffmpeg

# Install Docker
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sudo sh /tmp/get-docker.sh
    sudo usermod -aG docker "$USER"
    log "Docker installed. You may need to log out and back in for group changes."
fi
sudo systemctl enable docker
sudo systemctl start docker

# Install Docker Compose plugin
sudo apt-get install -y -qq docker-compose-plugin || {
    # Fallback: standalone docker-compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
}

# ── 3. Clone Repository ───────────────────────────────────────────────────────
log "Cloning repository..."
if [ -d "$APP_DIR" ]; then
    warn "Directory $APP_DIR already exists. Pulling latest..."
    cd "$APP_DIR" && git pull
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# ── 4. Environment Variables ──────────────────────────────────────────────────
if [ ! -f "$APP_DIR/backend/deploy/.env" ]; then
    warn "No .env file found. Creating from template..."
    cp "$APP_DIR/backend/deploy/.env.example" "$APP_DIR/backend/deploy/.env"
    
    # Generate a random SECRET_KEY
    RAND_KEY=$(openssl rand -hex 32)
    sed -i "s/change_me_to_a_random_hex_string/$RAND_KEY/" "$APP_DIR/backend/deploy/.env"
    
    err "IMPORTANT: Edit $APP_DIR/backend/deploy/.env and add your API keys!"
    err "  nano $APP_DIR/backend/deploy/.env"
fi

# ── 5. Build & Run Docker Container ───────────────────────────────────────────
log "Building and starting the MeetingMind API container..."
cd "$APP_DIR/backend"
sudo docker compose -f deploy/docker-compose.yml --env-file deploy/.env up --build -d

log "Waiting for the API to start..."
sleep 5
if curl -sf http://localhost:$API_PORT/health > /dev/null 2>&1; then
    log "API is healthy and running!"
else
    warn "API health check failed. Check logs: sudo docker compose -f deploy/docker-compose.yml logs"
fi

# ── 6. Firewall ───────────────────────────────────────────────────────────────
log "Configuring firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow $API_PORT/tcp
sudo ufw --force enable

# ── 7. Nginx Reverse Proxy (basic) ────────────────────────────────────────────
log "Setting up Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/meetingmind > /dev/null << NGINX
server {
    listen 80;
    server_name $EC2_IP;

    location / {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 300s;
        client_max_body_size 500M;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/meetingmind /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
log "Nginx is proxying port 80 → $API_PORT"

# ── 8. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        ✅ MeetingMind Backend Deployed Successfully!        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BLUE}API URL:${NC}       http://$EC2_IP:$API_PORT"
echo -e "  ${BLUE}Health Check:${NC}  curl http://$EC2_IP:$API_PORT/health"
echo -e "  ${BLUE}Via Nginx:${NC}     http://$EC2_IP"
echo ""
echo -e "  ${YELLOW}📋 Next Steps:${NC}"
echo -e "  1. Edit API keys:  ${GREEN}nano $APP_DIR/backend/deploy/.env${NC}"
echo -e "  2. Restart API:    ${GREEN}cd $APP_DIR/backend && sudo docker compose -f deploy/docker-compose.yml --env-file deploy/.env restart${NC}"
echo -e "  3. Set up domain + SSL: ${GREEN}sudo certbot --nginx -d your-domain.com${NC}"
echo -e "  4. Monitor logs:   ${GREEN}sudo docker compose -f deploy/docker-compose.yml logs -f${NC}"
echo ""
echo -e "  ${YELLOW}🌐 Vercel:${NC}"
echo -e "  Set ${GREEN}NEXT_PUBLIC_API_URL=http://$EC2_IP$([ \"$API_PORT\" != \"80\" ] && echo \":$API_PORT\")${NC} in your Vercel project env vars."
echo ""
