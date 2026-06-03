# Manual EC2 Deployment Guide

Follow these steps to deploy MeetingMind on a bare-metal AWS EC2 instance.

### 1. Launch EC2
*   **AMI**: Ubuntu 24.04 LTS.
*   **Security Group**: 
    *   Port 22 (SSH) - Your IP.
    *   Port 80 (HTTP) - Anywhere.
    *   Port 443 (HTTPS) - Anywhere.

### 2. Prepare Code
1.  Connect to your instance via SSH: `ssh -i key.pem ubuntu@your_ec2_ip`
2.  Clone the repository: `git clone <your-repo-url>`
3.  Go to the deploy folder: `cd meetapp/backend/deploy`
4.  Make the script executable: `chmod +x setup-manual.sh`

### 3. Initialize Server
Run the automated setup script:
```bash
./setup-manual.sh
```

### 4. Set Environment Variables
The script created a service that expects a `.env` file in `backend/`.
```bash
cd /home/ubuntu/meetapp/backend
nano .env
```
Paste your keys here:
```text
SECRET_KEY=your_secret
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
HF_TOKEN=your_token
WHISPER_MODEL=base
```
Then restart the service:
```bash
sudo systemctl restart meetingmind
```

### 5. Finalize Frontend
Update your Vercel `NEXT_PUBLIC_API_URL` to point to your EC2 public IP:
`NEXT_PUBLIC_API_URL=http://your_ec2_public_ip/api`
*(Redeploy Vercel after changing).*
