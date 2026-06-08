# 🎙 MeetingMind Intelligence

MeetingMind is an enterprise-grade AI platform for recording, transcribing, and analyzing meetings. It natively captures browser audio (tab audio) and provides deep meeting intelligence including executive summaries, action item tracking, and grounded Q&A.

## 🚀 Key Features

- **Native Tab Capture**: Record high-quality meeting audio directly from your browser tab (Google Meet, Zoom, Teams) without bots.
- **Whisper Transcription**: High-accuracy multi-speaker transcription powered by `faster-whisper`.
- **Speaker Diarization**: Automatically identifies who said what using `pyannote.audio`.
- **Intelligent Summaries**: Generates industry-standard MOM reports (JSON-structured) including summaries, decisions, risks, and action items.
- **Grounded Q&A (RAG)**: Chat with your meeting history. Answers are strictly grounded in meeting transcripts to prevent hallucinations.
- **Enterprise Ready**: Full FastAPI backend with SQLite/PostgreSQL support, Next.js frontend with Tailwind CSS, and secure JWT authentication.

## 🛠 Tech Stack

- **Frontend**: Next.js (TypeScript), Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI (Python), SQLAlchemy, Alembic.
- **AI/ML**: `faster-whisper`, `pyannote.audio`, `chromadb` (Vector DB), `sentence-transformers`.
- **LLM Support**: Groq (Llama 3), Google Gemini, Ollama (Local).
- **Deployment**: Vercel (Frontend), AWS EC2 + CloudFront (Backend).

## 📂 Project Structure

```text
meetapp/
├── backend/            # FastAPI Application
│   ├── app/
│   │   ├── api/       # REST Endpoints
│   │   ├── core/      # Pipeline & Configuration
│   │   ├── db/        # Database setup
│   │   ├── models/    # DB Schemas
│   │   ├── services/  # AI, Transcription, Export logic
│   ├── alembic/       # DB Migrations
│   └── deploy/        # Nginx & EC2 setup
├── frontend/           # Next.js Application
│   ├── src/
│   │   ├── app/       # Pages & UI
│   │   ├── hooks/     # Custom React Hooks (Recorder, etc.)
│   │   ├── lib/       # API Clients
│   │   └── store/     # State Management (Zustand)
└── README.md           # This guide
```

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
./venv/Scripts/activate
pip install -r requirements.txt
# Create .env file based on .env.example
uvicorn app.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
# Create .env file based on .env.example
npm run dev
```

## 🛡 Security & Edge Cases
- **FFmpeg Handling**: Robust audio chunking logic handles extremely long meetings without memory issues or timeouts.
- **Cumulative Offsets**: Fixed timestamp logic ensures continuous transcription across chunks.
- **Graceful Diarization**: Automatic CPU/GPU detection and fallback if speaker identification fails.
- **JWT Auth**: Secure user-isolated meeting storage and search.

## 📄 License
© 2026 MeetingMind. All rights reserved.
