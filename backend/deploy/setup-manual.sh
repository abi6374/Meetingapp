#!/bin/bash

# MeetingMind EC2 Setup Script (Ubuntu 24.04 LTS)
# This script installs Python 3.12, FFmpeg, and sets up the application.

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}1. Installing System Dependencies...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv ffmpeg build-essential libsm6 libxext6 nginx

echo -e "${GREEN}2. Setting up Virtual Environment...${NC}"
cd ..
python3 -m venv venv
source venv/bin/activate

echo -e "${GREEN}3. Installing Python Packages...${NC}"
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn

echo -e "${GREEN}4. Configuring Nginx...${NC}"
sudo cp deploy/nginx.conf /etc/nginx/sites-available/meetingmind
sudo ln -s /etc/nginx/sites-available/meetingmind /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo -e "${GREEN}5. Creating Systemd Service...${NC}"
CUR_USER=$(whoami)
CUR_DIR=$(pwd)

sudo bash -c "cat > /etc/systemd/system/meetingmind.service <<EOF
[Unit]
Description=Gunicorn instance to serve MeetingMind API
After=network.target

[Service]
User=$CUR_USER
Group=www-data
WorkingDirectory=$CUR_DIR
Environment=\"PATH=$CUR_DIR/venv/bin:/usr/local/bin:/usr/bin:/bin\"
EnvironmentFile=$CUR_DIR/.env
ExecStart=$CUR_DIR/venv/bin/gunicorn \\
    -w 1 \\
    -k uvicorn.workers.UvicornWorker \\
    app.main:app \\
    --bind 127.0.0.1:8000 \\
    --timeout 300

[Install]
WantedBy=multi-user.target
EOF"

sudo systemctl daemon-reload
sudo systemctl enable meetingmind
sudo systemctl start meetingmind

echo -e "${GREEN}Setup Complete!${NC}"
echo -e "Your API is now running on Port 80 via Nginx."
echo -e "Set ${GREEN}NEXT_PUBLIC_API_URL=http://your_ec2_ip${NC} in your Vercel project env vars."
