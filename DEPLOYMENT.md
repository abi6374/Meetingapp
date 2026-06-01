# MeetingMind Deployment Guide

This guide covers deploying the modernized MeetingMind SaaS platform.

## 1. Backend (FastAPI) Deployment
The backend handles heavy audio processing and AI generation. We recommend deploying to **Render**, **Railway**, or **Fly.io** using a Docker container, as `torch` and `ffmpeg` require specific system-level configurations.

### Prerequisites
- Add your API Keys (`HF_TOKEN`, `GROQ_API_KEY`, etc.) as environment variables in your deployment dashboard.

### Render Configuration
1. Create a new "Web Service" connected to your repository.
2. Root Directory: `backend/`
3. Environment: `Python 3.12`
4. Build Command: 
   ```bash
   apt-get update && apt-get install -y ffmpeg libsm6 libxext6 && pip install -r requirements.txt
   ```
   *(Note: For Render, using a `Dockerfile` is highly recommended to guarantee `ffmpeg` installation).*
5. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Dockerfile (Recommended)
Place this in your `backend/` directory if your host supports Docker:
```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg libsm6 libxext6 && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 2. Frontend (Next.js) Deployment
The frontend is optimized for **Vercel**.

1. Create a new project in Vercel.
2. Select your repository.
3. Root Directory: `frontend/`
4. Framework Preset: `Next.js`
5. Build Command: `npm run build`
6. Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://your-fastapi-backend-url.com` (Update your Axios calls to use this).

## 3. Graceful Diarization Fallback
In low-memory environments (like free tiers on Render/Railway), `pyannote.audio` may run out of memory (OOM). The backend architecture is explicitly designed to catch these system-level failures and fall back to standard Whisper transcription. To avoid unexpected crashes in production, ensure your deployment has **at least 2GB of RAM** if you intend to run full speaker diarization.
