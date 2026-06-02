#!/bin/bash
# =============================================================================
# MeetingMind — AWS EC2 User Data Script (Ubuntu 24.04)
# =============================================================================
# This runs automatically when the EC2 instance starts for the first time.
# It installs Docker, clones the repo, and launches the backend container.
# =============================================================================

set -euo pipefail

# ── 1. System Updates & Docker ────────────────────────────────────────────────
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common \
    git \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw

# Install Docker
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh
systemctl enable docker
systemctl start docker

# ── 2. Clone the Repository ───────────────────────────────────────────────────
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git meetingmind || true
cd meetingmind

# ── 3. Environment Variables ──────────────────────────────────────────────────
# Create .env from provided secrets or manually edit later
if [ ! -f backend/deploy/.env ]; then
    cat > backend/deploy/.env << 'EOF'
SECRET_KEY=change_me_to_a_random_hex_string
GROQ_API_KEY=
GEMINI_API_KEY=
HF_TOKEN=
WHISPER_MODEL=tiny
EOF
    echo "⚠️  WARNING: .env created with defaults. Edit backend/deploy/.env to set your keys."
fi

# ── 4. Build & Run ────────────────────────────────────────────────────────────
cd backend
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up --build -d

# ── 5. Firewall: Allow SSH, HTTP, HTTPS, and the API port ─────────────────────
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP (Nginx)
ufw allow 443/tcp     # HTTPS (Nginx)
ufw allow 8000/tcp    # Direct API access (optional)
ufw --force enable

# ── 6. Nginx Reverse Proxy (Optional — run manually for SSL) ──────────────────
# A basic nginx config is at backend/deploy/nginx.conf
# To enable SSL, run:
#   certbot --nginx -d your-domain.com
# Afterwards, uncomment the SSL lines in the nginx config

EC2_IP=$(curl -s http://checkip.amazonaws.com)
echo "✅ MeetingMind Backend deployed successfully!"
echo "   API running at:  http://${EC2_IP}:8000"
echo "   Health check:    curl http://localhost:8000/health"
echo ""
echo "📋 Next steps:"
echo "   1. Edit deploy/.env with your API keys:"
echo "      nano ~/meetingmind/backend/deploy/.env"
echo "   2. Restart with new keys:"
echo "      cd ~/meetingmind/backend && sudo docker compose -f deploy/docker-compose.yml --env-file deploy/.env restart"
echo "   3. (Optional) Set up a domain + SSL with certbot"
echo "   4. Set NEXT_PUBLIC_API_URL on Vercel to: http://${EC2_IP}:8000"
