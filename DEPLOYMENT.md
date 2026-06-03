# MeetingMind CloudFront + EC2 Deployment Guide

This guide details how to securely connect your Next.js frontend (Vercel) to your FastAPI backend (AWS EC2) using CloudFront as an HTTPS proxy.

## 1. Backend (AWS EC2) Configuration
### Nginx Setup
Your EC2 instance must run Nginx to handle incoming traffic on Port 80 and forward it to the FastAPI application.

**File:** `backend/deploy/nginx.conf`
Ensure the following settings are active:
* `client_max_body_size 100M;` (Allows large meeting uploads)
* `proxy_set_header X-Forwarded-Proto $http_x_forwarded_proto;` (Correctly detects HTTPS via CloudFront)
* `proxy_set_header X-Forwarded-Port $http_x_forwarded_port;` (Correctly detects the port via CloudFront)

### Application Service
The backend runs as a systemd service (`meetingmind.service`).
* Working Directory: `/home/ubuntu/Meetingapp/backend`
* Environment variables are loaded from `.env`.

---

## 2. CloudFront (HTTPS Proxy) Configuration
CloudFront provides the SSL certificate needed to talk to Vercel.

### Origin Settings
* **Protocol:** HTTP Only (EC2 handles Port 80).
* **Domain:** Your EC2 Public IPv4 DNS.

### Behavior Settings (CRITICAL)
* **Allowed HTTP Methods:** `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
* **Cache Policy:** `CachingDisabled`.
* **Origin Request Policy:** `AllViewerExceptHostHeader`. 
  * *This is required to pass the `Authorization` header to the backend.*

---

## 3. Frontend (Vercel) Configuration
* **NEXT_PUBLIC_API_URL:** `https://d233h9ny7ketsg.cloudfront.net/api`
* **Note:** Ensure there is **no trailing slash** after `/api`.

---

## 4. Security & CORS
The backend (`backend/app/main.py`) explicitly trusts your production domains:
* `https://meetingapp-two.vercel.app`
* `https://d233h9ny7ketsg.cloudfront.net`

## Troubleshooting 401 Errors
If you still see 401 errors:
1. Verify the **Origin Request Policy** in CloudFront is set to `AllViewerExceptHostHeader`.
2. Check that the `.env` file on EC2 contains the correct `SECRET_KEY` (must match the one used during signup).
3. Check Nginx logs: `sudo tail -f /var/log/nginx/access.log`.
