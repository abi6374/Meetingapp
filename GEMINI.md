# MeetingMind

AI-powered meeting transcription and conversational analysis. Record or upload audio, generate transcripts via Whisper, and ask questions using local (Ollama) or cloud (Groq, Gemini) LLMs.

## Project Overview

MeetingMind is a Streamlit application designed to streamline meeting documentation. It features:
- **Audio Intake**: Live browser recording or file uploads (MP3, WAV, M4A, etc.).
- **Transcription**: Uses `faster-whisper` for efficient, high-quality transcription on CPU.
- **Audio Chunking**: Automatically splits long audio into chunks using `ffmpeg` to prevent timeouts and handle large files reliably.
- **Multi-Provider AI**: Supports Ollama (local), Groq, and Google Gemini for transcript analysis and Q&A.
- **Export Options**: Save transcripts as `.txt` and full Q&A sessions as `.json`.

## Tech Stack

- **Frontend/App Framework**: Streamlit
- **Transcription**: `faster-whisper`
- **Audio Processing**: `pydub`, `ffmpeg` (external dependency)
- **AI Integration**: `groq`, `google-generativeai`, `requests` (for Ollama)
- **Document Generation**: `python-docx`, `fpdf2`, `reportlab`

## Getting Started

### Prerequisites

- Python 3.9+
- `ffmpeg` installed on your system path (required for audio chunking).

### Installation

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Configure environment:
   Copy `.streamlit/secrets.toml.example` to `.streamlit/secrets.toml` and add your API keys:
   ```toml
   GROQ_API_KEY = "your_key"
   GEMINI_API_KEY = "your_key"
   OLLAMA_URL = "http://localhost:11434"
   ```

### Running the App

```bash
streamlit run app.py
```

## Development Conventions

- **State Management**: Uses `st.session_state` extensively to manage transcript data, chat history, and processing status.
- **Modularity**: Currently a single-file application (`app.py`) with helper functions for specialized tasks (chunking, transcription, provider detection).
- **Styling**: Custom CSS is injected via `st.markdown` to provide a polished, dark-themed UI.
- **Error Handling**: Uses fallback mechanisms for `ffmpeg` and AI providers to ensure a graceful user experience.

## File Structure

- `app.py`: Main application logic, UI, and backend integration.
- `requirements.txt`: Python package dependencies.
- `.streamlit/`:
    - `config.toml`: Streamlit configuration (theming, server settings).
    - `secrets.toml`: Sensitive API keys (should NOT be committed).
- `README.md`: User-facing documentation and setup guide.

run command
 cd backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload  