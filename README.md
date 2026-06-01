# 🎙 MeetingMind

> Record or upload meeting audio → AI-powered transcript → Ask anything about it

---

## Features

- **Live browser recording** via `audio-recorder-streamlit`
- **Upload** any audio: MP3, WAV, M4A, OGG, FLAC, WEBM
- **Chunked transcription** — audio auto-split into N-minute pieces for reliable processing (no timeouts)
- **Three AI providers** — Ollama (local/cloud URL), Groq (free), Gemini (free tier)
- **Conversational Q&A** — ask anything about your meeting with full chat history
- **Export** transcript as `.txt` and full Q&A session as `.json`
- **Editable transcript** — fix transcription mistakes before asking questions

---

## Local Setup

```bash
# 1. Clone / copy files
cd meetingmind

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) install ffmpeg for pydub audio chunking
#    macOS:   brew install ffmpeg
#    Ubuntu:  sudo apt install ffmpeg
#    Windows: https://ffmpeg.org/download.html

# 4. Configure secrets
cp .streamlit/secrets.toml.example .streamlit/secrets.toml
# edit secrets.toml and fill in your keys

# 5. Run
streamlit run app.py
```

---

## AI Provider Setup

### Option A — Ollama (local, private, free)

```bash
# Install Ollama: https://ollama.com
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull llama3       # 4.7 GB, best quality
ollama pull mistral      # 4.1 GB, fast
ollama pull phi3         # 2.3 GB, lightweight

# Start server (usually auto-starts)
ollama serve
```

Set in secrets: `OLLAMA_URL = "http://localhost:11434"`

### Option B — Ollama on Cloud (for sharing with clients)

Host Ollama publicly using one of:
- **ngrok**: `ngrok http 11434` → use the HTTPS URL
- **Railway.app**: deploy Ollama Docker image, set env `OLLAMA_HOST=0.0.0.0`
- **Render.com**: free tier Docker deploy

Set: `OLLAMA_URL = "https://your-ollama-instance.railway.app"`

### Option C — Groq (easiest cloud option, free)

1. Go to https://console.groq.com/keys
2. Create a free API key
3. Set `GROQ_API_KEY = "gsk_..."` in secrets

Free tier: 6,000 tokens/min, 500K tokens/day — plenty for meeting Q&A.

### Option D — Google Gemini (generous free tier)

1. Go to https://aistudio.google.com/app/apikey
2. Create an API key
3. Set `GEMINI_API_KEY = "AIza..."` in secrets

Free tier: 15 req/min, 1M tokens/day with `gemini-1.5-flash`.

---

## Deployment on Streamlit Community Cloud (Free)

1. Push this folder to a **public GitHub repo**
2. Go to https://share.streamlit.io → New app
3. Select your repo, branch `main`, file `app.py`
4. Click **Advanced settings → Secrets** and paste:

```toml
GROQ_API_KEY = "your_groq_key_here"
GEMINI_API_KEY = "your_gemini_key_here"
# Optional: hosted Ollama URL
OLLAMA_URL = "https://your-ollama.railway.app"
```

5. Deploy — your client gets a public URL like `https://yourapp.streamlit.app`

> **Note**: Ollama running on localhost won't work on Streamlit Cloud.
> Use Groq or Gemini for cloud deployments, or host Ollama separately.

---

## Audio Chunking

Long recordings (1hr+) are automatically split:
- Default: 5-minute chunks
- Adjustable: 2–10 min via sidebar slider
- Each chunk is transcribed independently
- Results are merged into one seamless transcript
- Chunk breakdown shown in the app

---

## Whisper Models (Transcription)

| Model  | Size   | Speed  | Accuracy |
|--------|--------|--------|----------|
| `tiny` | 75 MB  | Fast   | Basic    |
| `base` | 145 MB | Medium | Good ✓  |
| `small`| 460 MB | Slow   | Better   |

Default is `base` — good balance for Streamlit Cloud's CPU.
Change in `app.py` → `WhisperModel("base", ...)`.

---

## File Structure

```
meetingmind/
├── app.py                  # Main app
├── requirements.txt        # Python dependencies
└── .streamlit/
    ├── config.toml         # Dark theme + upload size
    └── secrets.toml        # API keys (never commit this!)
```

Add `secrets.toml` to `.gitignore`:
```
.streamlit/secrets.toml
```
