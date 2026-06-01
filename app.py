import streamlit as st
import os
import io
import time
import json
import tempfile
import math
from datetime import datetime
from pathlib import Path

# ── Page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="MeetingMind",
    page_icon="🎙",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600&display=swap');

html, body, [class*="css"] {
    font-family: 'DM Sans', sans-serif;
}

/* Header */
.main-header {
    background: linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%);
    border: 1px solid #2a3050;
    border-radius: 16px;
    padding: 28px 32px;
    margin-bottom: 24px;
    position: relative;
    overflow: hidden;
}
.main-header::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.08) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 50%, rgba(16,185,129,0.06) 0%, transparent 60%);
    pointer-events: none;
}
.main-header h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2.2rem;
    color: #f1f5f9;
    margin: 0;
    letter-spacing: -0.5px;
}
.main-header p {
    color: #94a3b8;
    margin: 6px 0 0;
    font-size: 0.95rem;
    font-weight: 300;
}
.badge {
    display: inline-block;
    background: rgba(99,102,241,0.15);
    color: #818cf8;
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-right: 6px;
}
.badge.green { background: rgba(16,185,129,0.12); color: #34d399; border-color: rgba(16,185,129,0.3); }
.badge.amber { background: rgba(245,158,11,0.12); color: #fbbf24; border-color: rgba(245,158,11,0.3); }

/* Status cards */
.status-card {
    background: #1e2433;
    border: 1px solid #2a3050;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 12px;
}
.status-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
}
.dot-green { background: #10b981; box-shadow: 0 0 6px rgba(16,185,129,0.5); }
.dot-red   { background: #ef4444; }
.dot-amber { background: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }

/* Transcript box */
.transcript-box {
    background: #0d1117;
    border: 1px solid #2a3050;
    border-radius: 12px;
    padding: 20px;
    font-size: 0.92rem;
    line-height: 1.8;
    color: #cbd5e1;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
    font-family: 'DM Sans', sans-serif;
}

/* Chat bubbles */
.chat-user {
    background: linear-gradient(135deg, #312e81, #1e1b4b);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 18px 18px 4px 18px;
    padding: 12px 18px;
    margin: 8px 0;
    color: #e0e7ff;
    max-width: 80%;
    margin-left: auto;
    font-size: 0.93rem;
}
.chat-ai {
    background: #1e2433;
    border: 1px solid #2a3050;
    border-radius: 18px 18px 18px 4px;
    padding: 12px 18px;
    margin: 8px 0;
    color: #e2e8f0;
    max-width: 85%;
    font-size: 0.93rem;
    line-height: 1.7;
}
.chat-meta {
    font-size: 0.72rem;
    color: #64748b;
    margin-bottom: 4px;
}

/* Chunk progress */
.chunk-item {
    background: #161b27;
    border: 1px solid #2a3050;
    border-radius: 8px;
    padding: 8px 14px;
    margin: 4px 0;
    font-size: 0.82rem;
    color: #94a3b8;
}
.chunk-done { border-color: rgba(16,185,129,0.4); color: #86efac; }
.chunk-active { border-color: rgba(99,102,241,0.5); color: #c7d2fe; }

/* Provider pill */
.provider-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #1e2433;
    border: 1px solid #2a3050;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.8rem;
    color: #94a3b8;
}
</style>
""", unsafe_allow_html=True)

# ── Session state init ──────────────────────────────────────────────────────────
def init_state():
    defaults = {
        "transcript": "",
        "transcript_chunks": [],
        "chat_history": [],
        "audio_bytes": None,
        "processing": False,
        "meeting_title": "",
        "meeting_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "ai_provider": "auto",
        "selected_model": "",
        "transcript_segments": [],
        "diarization": None,
        "speakers": [],
        "speaker_map": {},
        "action_items": [],
        "mom": "",
        "pdf_bytes": None,
        "docx_bytes": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

init_state()

# ── Helper: detect available AI providers ──────────────────────────────────────
def detect_providers():
    providers = {}

    # Ollama (URL-based, user-configurable)
    ollama_url = st.secrets.get("OLLAMA_URL", "") or os.environ.get("OLLAMA_URL", "http://localhost:11434")
    try:
        import requests
        r = requests.get(f"{ollama_url}/api/tags", timeout=3)
        if r.status_code == 200:
            models = [m["name"] for m in r.json().get("models", [])]
            providers["ollama"] = {"url": ollama_url, "models": models or ["llama3", "mistral", "phi3"]}
    except Exception:
        pass

    # Groq
    groq_key = st.secrets.get("GROQ_API_KEY", "") or os.environ.get("GROQ_API_KEY", "")
    if groq_key:
        providers["groq"] = {
            "key": groq_key,
            "models": ["llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"],
        }

    # Gemini
    gemini_key = st.secrets.get("GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    if gemini_key:
        providers["gemini"] = {
            "key": gemini_key,
            "models": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
        }

    return providers

# ── Helper: chunk audio file ────────────────────────────────────────────────────
def chunk_audio(audio_bytes: bytes, chunk_minutes: int = 5) -> list[bytes]:
    """Split audio into N-minute chunks using pydub."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        chunk_ms = chunk_minutes * 60 * 1000
        chunks = []
        for i in range(0, len(audio), chunk_ms):
            chunk = audio[i:i + chunk_ms]
            buf = io.BytesIO()
            chunk.export(buf, format="wav")
            chunks.append(buf.getvalue())
        return chunks
    except Exception as e:
        st.warning(f"Audio chunking failed ({e}), processing as single file.")
        return [audio_bytes]

# ── Helper: transcribe with faster-whisper (returns list of segments) ─────────
@st.cache_resource
def load_whisper(model_name: str = "base"):
    try:
        from faster_whisper import WhisperModel
        return WhisperModel(model_name, device="cpu", compute_type="int8")
    except Exception:
        return None


def transcribe_chunk(audio_bytes: bytes, language: str = "auto", model_name: str = "base") -> list:
    try:
        model = load_whisper(model_name)
        if model is None:
            return [{"text": "[faster-whisper not installed or failed to load]", "start": 0.0, "end": 0.0}]

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name

        kwargs = {}
        if language != "auto":
            kwargs["language"] = language

        segments, _ = model.transcribe(tmp_path, beam_size=5, **kwargs)
        out = []
        for seg in segments:
            start = float(getattr(seg, "start", 0.0))
            end = float(getattr(seg, "end", 0.0))
            text = getattr(seg, "text", "").strip()
            out.append({"text": text, "start": start, "end": end})

        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        return out
    except ImportError:
        return [{"text": "[faster-whisper not installed. Run: pip install faster-whisper]", "start": 0.0, "end": 0.0}]
    except Exception as e:
        return [{"text": f"[Transcription error: {e}]", "start": 0.0, "end": 0.0}]



def map_segments_to_speakers(segments: list, diarization: list, unknown_label: str = "Unknown Speaker") -> list:
    """Assign a speaker to each transcript segment by maximizing temporal overlap.
    segments: list of {text,start,end}
    diarization: list of {start,end,speaker}
    Returns list of segments with added 'speaker' key.
    """
    if not diarization:
        for s in segments:
            s["speaker"] = unknown_label
        return segments

    # build list of diar segments
    diar = diarization
    for s in segments:
        s_start = s.get("start", 0.0)
        s_end = s.get("end", 0.0)
        best_sp = unknown_label
        best_overlap = 0.0
        seg_dur = max(0.0, s_end - s_start)
        for d in diar:
            d_start = d.get("start", 0.0)
            d_end = d.get("end", 0.0)
            overlap = max(0.0, min(s_end, d_end) - max(s_start, d_start))
            if overlap > best_overlap:
                best_overlap = overlap
                best_sp = d.get("speaker", unknown_label)

        # if overlap is tiny relative to segment, mark unknown
        if seg_dur > 0 and best_overlap / seg_dur < 0.2:
            s["speaker"] = unknown_label
        else:
            s["speaker"] = best_sp
    return segments


def extract_action_items(transcript: str) -> list:
    """Heuristic extraction of action items from transcript text.
    Returns list of short action strings.
    """
    actions = []
    # split into sentences
    import re
    sents = re.split(r"(?<=[\.!?])\s+", transcript)
    action_keywords = ["action", "will", "assign", "todo", "due", "deadline", "deliver", "implement", "follow up", "follow-up", "owner"]
    for sent in sents:
        low = sent.lower()
        if any(kw in low for kw in action_keywords):
            txt = sent.strip()
            if len(txt) > 10:
                actions.append(txt)
    # deduplicate
    seen = set()
    out = []
    for a in actions:
        if a not in seen:
            seen.add(a)
            out.append(a)
    return out


def build_speaker_transcript(segments: list) -> str:
    """Build a speaker-tagged transcript from segments with speaker info.
    Each line: [HH:MM:SS] Speaker: text
    """
    lines = []
    for s in sorted(segments, key=lambda x: x.get("start", 0.0)):
        start = int(s.get("start", 0.0))
        hh = start // 3600
        mm = (start % 3600) // 60
        ss = start % 60
        ts = f"{hh:02d}:{mm:02d}:{ss:02d}"
        sp = s.get("speaker") or "Unknown"
        name = st.session_state.speaker_map.get(sp, sp) if "speaker_map" in st.session_state else sp
        text = s.get("text", "").replace("\n", " ")
        lines.append(f"[{ts}] {name}: {text}")
    return "\n".join(lines)

# ── Helper: call AI for Q&A ────────────────────────────────────────────────────
def ask_ai(question: str, transcript: str, history: list, provider: str, model: str, providers: dict) -> str:
    system_prompt = f"""You are MeetingMind, an expert meeting analyst AI.
You have access to a meeting transcript. Answer questions clearly and accurately based ONLY on the transcript content.
If something is not in the transcript, say so honestly.
Be concise but thorough. Format your answers with bullet points or numbered lists when listing items.

MEETING TRANSCRIPT:
---
{transcript[:12000]}
---
"""
    messages_for_ai = [{"role": "system", "content": system_prompt}]
    for turn in history[-10:]:  # last 10 turns for context
        messages_for_ai.append({"role": turn["role"], "content": turn["content"]})
    messages_for_ai.append({"role": "user", "content": question})

    # ── Ollama ──
    if provider == "ollama":
        try:
            import requests
            url = providers["ollama"]["url"]
            payload = {
                "model": model,
                "messages": messages_for_ai,
                "stream": False,
            }
            r = requests.post(f"{url}/api/chat", json=payload, timeout=120)
            r.raise_for_status()
            return r.json()["message"]["content"]
        except Exception as e:
            return f"Ollama error: {e}"

    # ── Groq ──
    elif provider == "groq":
        try:
            from groq import Groq
            client = Groq(api_key=providers["groq"]["key"])
            resp = client.chat.completions.create(
                model=model,
                messages=messages_for_ai,
                max_tokens=1500,
                temperature=0.3,
            )
            return resp.choices[0].message.content
        except Exception as e:
            return f"Groq error: {e}"

    # ── Gemini ──
    elif provider == "gemini":
        try:
            import google.generativeai as genai
            genai.configure(api_key=providers["gemini"]["key"])
            gmodel = genai.GenerativeModel(
                model_name=model,
                system_instruction=system_prompt,
            )
            # Build Gemini-style history (no system role in history)
            gem_history = []
            for turn in history[-10:]:
                role = "user" if turn["role"] == "user" else "model"
                gem_history.append({"role": role, "parts": [turn["content"]]})
            chat = gmodel.start_chat(history=gem_history)
            response = chat.send_message(question)
            return response.text
        except Exception as e:
            return f"Gemini error: {e}"

    return "No AI provider available. Please configure an API key in secrets."


MOM_PROMPT = """
You are a professional meeting secretary. Based on the transcript below, generate a structured Minutes of Meeting document.

Use EXACTLY this format:

# Minutes of Meeting
**Meeting Title:** {title}
**Date & Time:** {date}
**Duration:** {duration}
**Attendees:** {speakers}

## 1. Executive Summary
[2-3 sentence overview of the meeting purpose and outcome]

## 2. Key Discussion Points
[Bullet points of main topics discussed, grouped by theme]

## 3. Decisions Made
[Numbered list of all decisions taken]

## 4. Action Items
| # | Action | Owner | Deadline |
|---|--------|-------|----------|
[Extract every task/action item mentioned, assign to the speaker who agreed to it]

## 5. Next Steps
[What happens after this meeting]

## 6. Next Meeting
[Date/time if mentioned, otherwise "TBD"]

TRANSCRIPT:
{transcript}
"""


@st.cache_data(ttl=3600)
def generate_mom_cached(title: str, date: str, duration: str, speakers: str, transcript: str, actions: list, provider: str, model: str, providers: dict) -> str:
    prompt = MOM_PROMPT.format(title=title, date=date, duration=duration, speakers=speakers, transcript=transcript)
    # Append extracted actions to help the AI
    if actions:
        prompt = prompt + "\n\nEXTRACTED_ACTIONS:\n" + "\n".join(f"- {a}" for a in actions)
    # Use ask_ai to generate the MoM
    return ask_ai(prompt, transcript, [], provider, model, providers)


def export_pdf(mom_text: str, logo_bytes: bytes | None = None) -> bytes:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        width, height = A4
        # Logo
        if logo_bytes:
            from reportlab.lib.utils import ImageReader
            img = ImageReader(io.BytesIO(logo_bytes))
            c.drawImage(img, 15 * mm, height - 35 * mm, width=30 * mm, preserveAspectRatio=True, mask='auto')

        c.setFont("Helvetica-Bold", 16)
        c.drawString(50 * mm, height - 20 * mm, "Minutes of Meeting")
        c.setFont("Helvetica", 10)
        text = c.beginText(15 * mm, height - 45 * mm)
        for line in mom_text.splitlines():
            text.textLine(line)
        c.drawText(text)
        c.showPage()
        c.save()
        buf.seek(0)
        return buf.read()
    except Exception as e:
        st.error(f"PDF export failed: {e}")
        return b""


def export_docx(mom_text: str) -> bytes:
    try:
        from docx import Document
        from docx.shared import Pt
        doc = Document()
        for line in mom_text.splitlines():
            if line.startswith('# '):
                doc.add_heading(line.replace('# ', ''), level=1)
            elif line.startswith('## '):
                doc.add_heading(line.replace('## ', ''), level=2)
            else:
                p = doc.add_paragraph(line)
                p.style.font.size = Pt(10)
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        st.error(f"DOCX export failed: {e}")
        return b""

# ══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("### ⚙️ Configuration")

    providers = detect_providers()

    # Provider status
    st.markdown("**AI Providers**")
    for p, info in providers.items():
        icon = {"ollama": "🖥", "groq": "⚡", "gemini": "✨"}.get(p, "🤖")
        st.markdown(
            f'<div class="status-card" style="padding:10px 14px;">'
            f'<span class="status-dot dot-green"></span>'
            f'{icon} <strong>{p.capitalize()}</strong>'
            f'</div>',
            unsafe_allow_html=True,
        )

    if not providers:
        st.error("No AI provider found. Add OLLAMA_URL, GROQ_API_KEY or GEMINI_API_KEY in secrets.")

    # Provider + model selector
    st.markdown("**Select Provider**")
    if providers:
        provider_choice = st.selectbox(
            "Provider", list(providers.keys()),
            format_func=lambda x: {"ollama": "🖥 Ollama (local/cloud URL)", "groq": "⚡ Groq (free cloud)", "gemini": "✨ Gemini"}.get(x, x),
            label_visibility="collapsed",
        )
        model_list = providers[provider_choice].get("models", [])
        model_choice = st.selectbox("Model", model_list, label_visibility="collapsed")
        st.session_state.ai_provider = provider_choice
        st.session_state.selected_model = model_choice
    else:
        provider_choice = None
        model_choice = None

    st.divider()

    # Transcription settings
    st.markdown("**Transcription**")
    whisper_lang = st.selectbox(
        "Language",
        ["auto", "en", "ta", "hi", "fr", "de", "es", "zh", "ar", "pt", "ru", "ja", "ko"],
        help="Auto-detect or pick a language for faster/better accuracy",
    )
    chunk_size = st.slider("Chunk size (minutes)", 2, 10, 5,
                           help="Audio is split into this size for reliable processing")

    st.divider()

    # Meeting metadata
    st.markdown("**Meeting Info**")
    st.session_state.meeting_title = st.text_input("Title", st.session_state.meeting_title,
                                                    placeholder="e.g. Sprint Review Q3")
    st.session_state.meeting_date = st.text_input("Date", st.session_state.meeting_date)

    st.divider()

    # Reset
    if st.button("🗑 Clear Session", use_container_width=True):
        for k in ["transcript", "transcript_chunks", "chat_history", "audio_bytes"]:
            st.session_state[k] = "" if k in ["transcript", "meeting_title"] else [] if k in ["transcript_chunks", "chat_history"] else None
        st.rerun()

    # Export chat
    if st.session_state.chat_history:
        export_data = {
            "meeting": st.session_state.meeting_title,
            "date": st.session_state.meeting_date,
            "transcript": st.session_state.transcript,
            "qa": st.session_state.chat_history,
        }
        st.download_button(
            "💾 Export Q&A (JSON)",
            data=json.dumps(export_data, indent=2),
            file_name=f"meetingmind_{datetime.now().strftime('%Y%m%d_%H%M')}.json",
            mime="application/json",
            use_container_width=True,
        )

    # Company logo for PDF header
    st.markdown("---")
    st.markdown("**Letterhead / Logo (optional)**")
    logo = st.file_uploader("Upload logo (PNG/JPG)", type=["png", "jpg", "jpeg"], key="logo_upload")
    if logo:
        st.session_state.logo_bytes = logo.read()

    # Speaker rename & talk-time (when diarization exists)
    if st.session_state.diarization:
        st.markdown("---")
        st.markdown("**Speaker Renames**")
        for s in st.session_state.speakers:
            key = f"rename_{s}"
            newname = st.text_input(f"{s} →", value=st.session_state.speaker_map.get(s, s), key=key)
            st.session_state.speaker_map[s] = newname

        # Talk-time stats
        st.markdown("**Talk-time**")
        # compute durations
        durations = {}
        total_time = 0.0
        for seg in st.session_state.diarization:
            sp = seg.get("speaker")
            dur = max(0.0, seg.get("end", 0.0) - seg.get("start", 0.0))
            durations[sp] = durations.get(sp, 0.0) + dur
            total_time += dur
        if total_time > 0:
            for sp, sec in sorted(durations.items(), key=lambda x: -x[1]):
                name = st.session_state.speaker_map.get(sp, sp)
                pct = sec / total_time
                st.markdown(f"**{name}** — {int(sec)}s ({pct*100:.1f}%)")
                st.progress(pct)


# ══════════════════════════════════════════════════════════════════════════════
# MAIN HEADER
# ══════════════════════════════════════════════════════════════════════════════
st.markdown("""
<div class="main-header">
  <h1>🎙 MeetingMind</h1>
  <p>Record or upload meeting audio → get an AI-powered transcript → ask anything about it</p>
  <div style="margin-top:12px;">
    <span class="badge">Whisper ASR</span>
    <span class="badge green">Chunked Processing</span>
    <span class="badge amber">Multi-AI Q&A</span>
  </div>
</div>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# TABS
# ══════════════════════════════════════════════════════════════════════════════
tab_live, tab_upload, tab_transcript, tab_mom = st.tabs([
    "🔴 Live Meeting",
    "📁 Upload & Process",
    "📋 Transcript",
    "📄 Minutes & Export",
])


# -----------------------------
# TAB: Live Meeting
# -----------------------------
with tab_live:
    st.header("🔴 Live Meeting Mode")
    col_left, col_right = st.columns([3, 1])
    with col_left:
        st.markdown("### Live recording and waveform")
        try:
            from audio_recorder_streamlit import audio_recorder

            if "live_recording" not in st.session_state:
                st.session_state.live_recording = False
                st.session_state.live_start = None

            if not st.session_state.live_recording:
                if st.button("Start Meeting", use_container_width=True, type="primary"):
                    st.session_state.live_recording = True
                    st.session_state.live_start = time.time()
                    st.session_state.audio_bytes = None
                    st.experimental_rerun()
            else:
                if st.button("Stop & Process", use_container_width=True):
                    st.session_state.live_recording = False
                    st.session_state.live_end = time.time()
                st.markdown('<div class="wave"></div>', unsafe_allow_html=True)
                elapsed = int(time.time() - st.session_state.live_start)
                st.markdown(f"**Live time:** {elapsed//3600:02d}:{(elapsed%3600)//60:02d}:{elapsed%60:02d}")

            audio_live = audio_recorder(text="Meeting live — click to stop", pause_threshold=60.0)
            if audio_live:
                st.session_state.audio_bytes = audio_live
                st.success(f"Captured {len(audio_live)/1024:.1f} KB of audio")
                st.audio(audio_live)
        except ImportError:
            st.warning("Install `audio-recorder-streamlit` for live recording. Use Upload tab instead.")

    with col_right:
        st.markdown("### Quick Stats")
        if st.session_state.audio_bytes:
            st.metric("Audio captured (KB)", f"{len(st.session_state.audio_bytes)/1024:.1f}")
        else:
            st.info("No live audio yet — start the meeting")


# -----------------------------
# TAB: Upload & Process
# -----------------------------
with tab_upload:
    st.header("📁 Upload & Process")
    st.markdown("Upload audio or use captured live audio, then transcribe and optionally run speaker diarization.")
    uploaded = st.file_uploader("Upload audio file", type=["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4"])
    if uploaded:
        st.session_state.audio_bytes = uploaded.read()
        st.success(f"Uploaded {uploaded.name}")
        st.audio(st.session_state.audio_bytes)

    if st.session_state.audio_bytes:
        st.markdown("---")
        if st.button("Process: Transcribe + Diarize", use_container_width=True, type="primary"):
            st.session_state.processing = True
            st.session_state.transcript = ""
            st.session_state.transcript_segments = []
            with st.spinner("Chunking audio..."):
                chunks = chunk_audio(st.session_state.audio_bytes, chunk_minutes=chunk_size)

            total_segments = []
            pbar = st.progress(0)
            for i, chunk in enumerate(chunks):
                segs = transcribe_chunk(chunk, language=whisper_lang)
                if isinstance(segs, list):
                    for s in segs:
                        total_segments.append(s)
                else:
                    total_segments.append({"text": str(segs), "start": 0.0, "end": 0.0})
                pbar.progress((i + 1) / len(chunks))

            st.session_state.transcript_segments = total_segments
            st.session_state.transcript = "\n\n".join(s.get("text", "") for s in total_segments)


            # Attempt diarization
            hf = st.secrets.get("HF_TOKEN", "") or os.environ.get("HF_TOKEN", "")
            if hf:
                try:
                    from pyannote.audio import Pipeline

                    @st.cache_resource
                    def load_pyannote(token: str = hf):
                        return Pipeline.from_pretrained("pyannote/speaker-diarization-3.1", use_auth_token=token)

                    pipeline = load_pyannote()
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                        f.write(st.session_state.audio_bytes)
                        wav_path = f.name
                    diar = pipeline(wav_path)
                    # diar is a pyannote.core.Annotation: iterate segments
                    speakers = []
                    diar_segments = []
                    for turn, track in diar.itertracks(yield_label=True):
                        s_start = float(turn.start)
                        s_end = float(turn.end)
                        label = track
                        speakers.append(label)
                        diar_segments.append({"start": s_start, "end": s_end, "speaker": label})

                    speakers = sorted(list(set(speakers)))
                    # Map speakers to friendly names
                    st.session_state.diarization = diar_segments
                    st.session_state.speakers = speakers
                    st.session_state.speaker_map = {s: s for s in speakers}
                    # Map transcript segments to speakers by overlap
                    mapped = map_segments_to_speakers(st.session_state.transcript_segments, st.session_state.diarization)
                    st.session_state.transcript_segments = mapped
                    st.session_state.action_items = extract_action_items(st.session_state.transcript)
                    st.success(f"Diarization complete — {len(speakers)} speakers detected")
                except Exception as e:
                    st.warning(f"Speaker diarization failed: {e}")
                    st.session_state.diarization = None
            else:
                st.warning("HF_TOKEN not set — diarization disabled. Add HF_TOKEN in secrets to enable.")
                # Still extract actions from transcript
                st.session_state.action_items = extract_action_items(st.session_state.transcript)

            st.session_state.processing = False


# -----------------------------
# TAB: Transcript Viewer
# -----------------------------
with tab_transcript:
    st.header("📋 Transcript")
    if not st.session_state.transcript:
        st.info("No transcript yet. Process audio in the Upload tab.")
    else:
        st.markdown(f"**{len(st.session_state.transcript.split()):,} words**")
        st.download_button("⬇ Download .txt", data=st.session_state.transcript, file_name=f"transcript_{datetime.now().strftime('%Y%m%d_%H%M')}.txt")

        # Speaker timeline view (grouped chat bubbles)
        if st.session_state.transcript_segments:
            st.markdown("### Diarized timeline")
            # color palette
            palette = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"]
            speakers = st.session_state.get("speakers") or sorted(list({s.get("speaker") for s in st.session_state.transcript_segments if s.get("speaker")}))
            color_map = {sp: palette[i % len(palette)] for i, sp in enumerate(speakers)}

            # group contiguous segments by speaker
            grouped = []
            prev_sp = None
            buf_text = []
            buf_start = 0.0
            for seg in sorted(st.session_state.transcript_segments, key=lambda x: x.get("start", 0.0)):
                sp = seg.get("speaker", "Unknown")
                if prev_sp is None:
                    prev_sp = sp
                    buf_text = [seg.get("text", "")]
                    buf_start = seg.get("start", 0.0)
                elif sp == prev_sp:
                    buf_text.append(seg.get("text", ""))
                else:
                    grouped.append({"speaker": prev_sp, "start": buf_start, "text": " ".join(buf_text)})
                    prev_sp = sp
                    buf_text = [seg.get("text", "")]
                    buf_start = seg.get("start", 0.0)
            if prev_sp is not None:
                grouped.append({"speaker": prev_sp, "start": buf_start, "text": " ".join(buf_text)})

            for g in grouped:
                sp = g["speaker"]
                name = st.session_state.speaker_map.get(sp, sp)
                color = color_map.get(sp, "#64748b")
                start = int(g.get("start", 0))
                tstamp = f"[{start//60:02d}:{start%60:02d}]"
                initial = (name.split()[0][0] if name else "?")
                html = (
                    f'<div style="display:flex;gap:10px;align-items:flex-start;margin:8px 0;">'
                    f'<div style="width:40px;height:40px;border-radius:20px;background:{color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">{initial}</div>'
                    f'<div style="flex:1">'
                    f'<div style="font-size:0.85rem;color:#94a3b8;margin-bottom:4px">{tstamp} <strong style="color:#e2e8f0">{name}</strong></div>'
                    f'<div style="background:#0f1724;border:1px solid #1f2937;border-radius:10px;padding:10px;color:#cbd5e1">{g["text"]}</div>'
                    f'</div></div>'
                )
                st.markdown(html, unsafe_allow_html=True)
        else:
            st.markdown("### Transcript (no diarization)")
            st.text_area("Transcript", value=st.session_state.transcript, height=400)


# -----------------------------
# TAB: Minutes & Export
# -----------------------------
with tab_mom:
    st.header("📄 Minutes of Meeting (MoM)")
    if not st.session_state.transcript:
        st.info("No transcript available to generate MoM.")
    else:
        st.text_input("Meeting Title", key="mom_title", value=st.session_state.meeting_title)
        st.text_input("Date & Time", key="mom_date", value=st.session_state.meeting_date)
        duration_str = "TBD"
        if hasattr(st.session_state, "live_start") and hasattr(st.session_state, "live_end"):
            duration_sec = int(st.session_state.live_end - st.session_state.live_start)
            duration_str = f"{duration_sec//60}m {duration_sec%60}s"

        st.markdown("### Summary & Generate")
        if st.button("Generate MoM (AI)", use_container_width=True):
            provider = st.session_state.ai_provider if st.session_state.ai_provider != "auto" else provider_choice or next(iter(providers), None)
            model = st.session_state.selected_model or model_choice
            speakers_list = ", ".join(st.session_state.speakers) if st.session_state.get("speakers") else "TBD"
            tagged = build_speaker_transcript(st.session_state.transcript_segments) if st.session_state.transcript_segments else st.session_state.transcript
            actions = st.session_state.get("action_items", [])
            mom_text = generate_mom_cached(
                title=st.session_state.get("mom_title", ""),
                date=st.session_state.get("mom_date", ""),
                duration=duration_str,
                speakers=speakers_list,
                transcript=tagged,
                actions=actions,
                provider=provider,
                model=model,
                providers=providers,
            )
            st.session_state.mom = mom_text
            st.success("MoM generated")

        if st.session_state.mom:
            st.markdown("### Minutes")
            st.text_area("MoM", value=st.session_state.mom, height=500)
            # Exports (TXT always)
            col1, col2, col3 = st.columns(3)
            with col1:
                st.download_button("Download .txt", data=st.session_state.mom, file_name="mom.txt")
            with col2:
                try:
                    pdf_bytes = export_pdf(st.session_state.mom, logo_bytes=st.session_state.get("logo_bytes"))
                    if pdf_bytes:
                        st.download_button("Download PDF", data=pdf_bytes, file_name="mom.pdf", mime="application/pdf")
                    else:
                        st.markdown("PDF export not available")
                except Exception as e:
                    st.markdown(f"PDF export error: {e}")
            with col3:
                try:
                    docx_bytes = export_docx(st.session_state.mom)
                    if docx_bytes:
                        st.download_button("Download DOCX", data=docx_bytes, file_name="mom.docx", mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                    else:
                        st.markdown("DOCX export not available")
                except Exception as e:
                    st.markdown(f"DOCX export error: {e}")
