# MeetingMind — AWS EC2 Backend Deployment Guide

This guide walks you through deploying the MeetingMind FastAPI backend on **AWS EC2** and the Next.js frontend on **Vercel**.

---

## 📋 Prerequisites

- **AWS Account** with permissions to launch EC2 instances
- **Vercel Account** (free tier: [vercel.com](https://vercel.com))
- **GitHub Repository** with your code pushed
- API keys for at least one AI provider:
  - [Groq](https://console.groq.com/keys) (free, recommended) **or**
  - [Google Gemini](https://aistudio.google.com/app/apikey) (free)

---

## 🚀 Part 1: Backend on AWS EC2

### Step 1: Launch an EC2 Instance

1. Go to [AWS EC2 Console](https://console.aws.amazon.com/ec2/) → **Launch Instance**

2. **Name:** `meetingmind-backend`

3. **AMI:** Ubuntu Server 24.04 LTS (HVM), x86

4. **Instance Type:**
   | Instance | RAM | vCPUs | Use Case |
   |----------|-----|-------|----------|
   | `t3.medium` | 4 GB | 2 | ✅ **Recommended** — fits in free-tier credits, runs Whisper `tiny` |
   | `t3.large` | 8 GB | 2 | Better for diarization (PyAnnote + Whisper simultaneously) |
   | `t3.xlarge` | 16 GB | 4 | For production with diarization + large meetings |

5. **Key Pair:** Create or select an existing key pair (.pem) to SSH in

6. **Network Settings — Security Group:**
   ```
   SSH       (22)     → My IP
   HTTP      (80)     → Anywhere (0.0.0.0/0)
   HTTPS     (443)    → Anywhere (0.0.0.0/0) — for SSL later
   Custom TCP (8000)  → Anywhere (0.0.0.0/0) — direct API access
   ```

7. **Configure Storage:** 
   - **30 GB gp3** (free tier eligible up to 30GB)
   - Delete on termination: ✅ (we use Docker volumes for persistence)

8. **Advanced Details → User Data:** Paste the contents of [`ec2-user-data.sh`](./ec2-user-data.sh), or better yet, use the manual setup below.

9. Click **Launch Instance**

### Step 2: Connect & Configure (Manual SSH)

Once the instance is **Running**, get its **Public IPv4 address** from the EC2 console.

```bash
# Replace with your key and IP
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 3: Run the Setup Script

```bash
# Clone and set up everything
git clone https://github.com/YOUR_USER/YOUR_REPO.git ~/meetingmind
cd ~/meetingmind/backend

# Copy environment template
cp deploy/.env.example deploy/.env

# Generate a secure key
openssl rand -hex 32

# Edit the .env file with your API keys
nano deploy/.env
```

Fill in your `.env` file:

```bash
SECRET_KEY=<paste the output of openssl rand -hex 32>
GROQ_API_KEY=gsk_your_groq_key
# or
GEMINI_API_KEY=AIza_your_gemini_key
HF_TOKEN=hf_your_huggingface_token   # only if using diarization
```

### Step 4: Build & Run

```bash
# Build the Docker image and start
sudo docker compose -f deploy/docker-compose.yml --env-file deploy/.env up --build -d

# Check if it's running
sudo docker ps

# Check logs
sudo docker compose -f deploy/docker-compose.yml logs -f

# Verify health
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok","app":"MeetingMind API","environment":"production"}
```

### Step 5: Set Up Nginx + SSL (Optional but Recommended)

```bash
# Install and configure Nginx
sudo nano /etc/nginx/sites-available/meetingmind
```

Copy the config from [`deploy/nginx.conf`](./nginx.conf), replacing `your-domain.com` with your actual domain or EC2 public IP.

```bash
# Enable the site
sudo ln -sf /etc/nginx/sites-available/meetingmind /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Set up SSL (requires a domain name)
sudo certbot --nginx -d your-domain.com
```

> **Without a domain:** The API will be available at `http://<EC2_PUBLIC_IP>:8000`

### Step 6: Make It Survive Reboots

Docker is set to `restart: unless-stopped` in docker-compose, so your container restarts automatically. Verify:

```bash
sudo docker update --restart unless-stopped meetingmind-api
```

---

## 🌐 Part 2: Frontend on Vercel

### Step 1: Push to GitHub

Make sure your code is in a GitHub repository:

```bash
git add .
git commit -m "Add deployment configs"
git push origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. **Configure Project:**
   - **Root Directory:** `frontend/` (⚠️ **Important**: select this!)
   - **Framework Preset:** `Next.js` (auto-detected)
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`

4. **Environment Variables:**
   ```
   Name: NEXT_PUBLIC_API_URL
   Value: http://<EC2_PUBLIC_IP>:8000
   ```
   If you set up Nginx on port 80 without SSL:
   ```
   Value: http://<EC2_PUBLIC_IP>
   ```
   If you set up SSL with a domain:
   ```
   Value: https://your-domain.com
   ```

5. Click **Deploy**

### Step 3: Redeploy on Backend Changes

Vercel auto-deploys on every push to the main branch. If your EC2 IP changes, update the `NEXT_PUBLIC_API_URL` environment variable in Vercel project settings and redeploy.

> **Tip:** To avoid URL changes if the EC2 instance restarts, allocate an **Elastic IP** in AWS and associate it with your instance.

---

## 🔧 Management Commands

```bash
# SSH into the instance
ssh -i your-key.pem ubuntu@<EC2_IP>

# Restart the API
cd ~/meetingmind/backend && sudo docker compose -f deploy/docker-compose.yml restart

# View logs
sudo docker compose -f deploy/docker-compose.yml logs -f

# Update to the latest code
cd ~/meetingmind && git pull && cd backend && sudo docker compose -f deploy/docker-compose.yml up --build -d

# Stop the API
sudo docker compose -f deploy/docker-compose.yml down

# Backup the SQLite database
sudo cp /var/lib/docker/volumes/backend_meetingmind-data/_data/meetingmind.db ~/backup-$(date +%Y%m%d).db
```

---

## 📊 Cost Estimate (AWS)

| Service | Configuration | Monthly Cost |
|---------|--------------|-------------|
| EC2 t3.medium | 4 GB RAM, 2 vCPUs, 30GB gp3 | ~$30 (on-demand) |
| Elastic IP | 1 static IP (if used) | $0 (while attached) |
| Data Transfer | 100 GB out | ~$9 |
| **Total** | | **~$39/month** |

> **Save money:** Use a **t3.medium (or t3a.medium) Reserved Instance** (1-year) → ~$15/month.  
> Or go **t3.nano/t3.micro** for testing (~$5/month), but expect slower transcription.

---

## 🔄 Updating the Deployment

```bash
# On your EC2 instance:

# 1. Pull latest code
cd ~/meetingmind && git pull

# 2. Rebuild and restart
cd backend && sudo docker compose -f deploy/docker-compose.yml up --build -d

# 3. Verify
curl http://localhost:8000/health
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Container exits immediately | Check logs: `sudo docker compose logs` — often a missing `SECRET_KEY` |
| 502 Bad Gateway from Nginx | API container not running: `sudo docker ps` — start it with `docker compose up -d` |
| "Out of Memory" during transcription | Use `WHISPER_MODEL=tiny` (lowest RAM), upgrade to `t3.large` |
| SQLite database resets on restart | Data is in Docker volumes. Run `sudo docker volume ls` — if missing, data wasn't persisted |
| Port 8000 already in use | `sudo lsof -i :8000` find and kill the process, or change the port |
| CORS errors from frontend | Verify `NEXT_PUBLIC_API_URL` matches the actual backend URL (no trailing slash) |
| API key not working | Check the `.env` file is correct and restart: `sudo docker compose restart` |

---

## 📁 Deployment File Reference

| File | Purpose |
|------|---------|
| `deploy/docker-compose.yml` | Container orchestration with volumes & env vars |
| `deploy/.env.example` | Template for environment variables |
| `deploy/ec2-user-data.sh` | Auto-setup script (EC2 user-data) |
| `deploy/setup-manual.sh` | Manual setup script (run after SSH) |
| `deploy/nginx.conf` | Nginx reverse proxy config with SSL |
| `deploy/README.md` | **This file** — full deployment guide |
| `.dockerignore` | Optimizes Docker build context |
| `frontend/vercel.json` | Vercel deployment configuration |
