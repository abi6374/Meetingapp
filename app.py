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

# ── Helper: transcribe with faster-whisper ──────────────────────────────────────
def transcribe_chunk(audio_bytes: bytes, language: str = "auto") -> str:
    try:
        from faster_whisper import WhisperModel
        if "whisper_model" not in st.session_state:
            with st.spinner("Loading Whisper model (first time only)..."):
                st.session_state.whisper_model = WhisperModel(
                    "base", device="cpu", compute_type="int8"
                )
        model = st.session_state.whisper_model
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            tmp_path = f.name
        kwargs = {}
        if language != "auto":
            kwargs["language"] = language
        segments, _ = model.transcribe(tmp_path, beam_size=5, **kwargs)
        text = " ".join(seg.text.strip() for seg in segments)
        os.unlink(tmp_path)
        return text
    except ImportError:
        return "[faster-whisper not installed. Run: pip install faster-whisper]"
    except Exception as e:
        return f"[Transcription error: {e}]"

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
tab1, tab2, tab3 = st.tabs(["🎙 Record & Transcribe", "💬 Ask Questions", "📋 Transcript"])

# ────────────────────────────────────────────────────────────────────────────
# TAB 1 — Record & Transcribe
# ────────────────────────────────────────────────────────────────────────────
with tab1:
    col1, col2 = st.columns([1, 1], gap="large")

    with col1:
        st.markdown("#### 🎙 Live Recording")
        st.caption("Record directly in your browser")
        try:
            from audio_recorder_streamlit import audio_recorder
            audio_bytes_live = audio_recorder(
                text="Click to record",
                recording_color="#6366f1",
                neutral_color="#334155",
                icon_size="2x",
                pause_threshold=3.0,
                sample_rate=16000,
            )
            if audio_bytes_live:
                st.session_state.audio_bytes = audio_bytes_live
                st.success(f"Recorded {len(audio_bytes_live)/1024:.1f} KB")
                st.audio(audio_bytes_live, format="audio/wav")
        except ImportError:
            st.warning("`audio-recorder-streamlit` not installed. Use file upload below.")
            audio_bytes_live = None

    with col2:
        st.markdown("#### 📁 Upload Audio File")
        st.caption("MP3, WAV, M4A, OGG, FLAC, WEBM")
        uploaded = st.file_uploader(
            "Upload",
            type=["mp3", "wav", "m4a", "ogg", "flac", "webm", "mp4"],
            label_visibility="collapsed",
        )
        if uploaded:
            st.session_state.audio_bytes = uploaded.read()
            st.success(f"Uploaded: {uploaded.name} ({len(st.session_state.audio_bytes)/1024:.1f} KB)")
            st.audio(st.session_state.audio_bytes)

    st.divider()

    # Transcribe button
    if st.session_state.audio_bytes:
        audio_size_mb = len(st.session_state.audio_bytes) / (1024 * 1024)
        st.info(f"Audio ready: **{audio_size_mb:.2f} MB** — will be split into **~{chunk_size}-min chunks** for reliable processing.")

        if st.button("🔊 Transcribe Audio", type="primary", use_container_width=True):
            st.session_state.transcript = ""
            st.session_state.transcript_chunks = []

            with st.status("Processing audio...", expanded=True) as status_box:
                # Step 1: Chunk
                st.write("✂️ Splitting audio into chunks...")
                chunks = chunk_audio(st.session_state.audio_bytes, chunk_minutes=chunk_size)
                n = len(chunks)
                st.write(f"→ {n} chunk(s) of up to {chunk_size} min each")

                # Step 2: Transcribe each chunk
                full_text = []
                progress = st.progress(0)
                for i, chunk in enumerate(chunks):
                    st.write(f"🔤 Transcribing chunk {i+1}/{n}...")
                    chunk_text = transcribe_chunk(chunk, language=whisper_lang)
                    full_text.append(chunk_text)
                    st.session_state.transcript_chunks.append({
                        "index": i + 1,
                        "start_min": i * chunk_size,
                        "end_min": (i + 1) * chunk_size,
                        "text": chunk_text,
                    })
                    progress.progress((i + 1) / n)

                st.session_state.transcript = "\n\n".join(full_text)
                status_box.update(label="✅ Transcription complete!", state="complete")

            st.success("Transcript ready! Head to the **💬 Ask Questions** tab.")
            st.balloons()
    else:
        st.info("👆 Record or upload audio above to begin.")

    # Show chunk breakdown if available
    if st.session_state.transcript_chunks:
        with st.expander(f"📦 Chunk breakdown ({len(st.session_state.transcript_chunks)} chunks)"):
            for c in st.session_state.transcript_chunks:
                st.markdown(
                    f'<div class="chunk-item chunk-done">'
                    f'<strong>Chunk {c["index"]}</strong> ({c["start_min"]}–{c["end_min"]} min) '
                    f'— {len(c["text"].split())} words'
                    f'</div>',
                    unsafe_allow_html=True,
                )

# ────────────────────────────────────────────────────────────────────────────
# TAB 2 — Q&A Chat
# ────────────────────────────────────────────────────────────────────────────
with tab2:
    if not st.session_state.transcript:
        st.info("📋 No transcript yet. Go to **🎙 Record & Transcribe** first.")
    else:
        # Provider status bar
        if provider_choice and model_choice:
            st.markdown(
                f'<div class="provider-pill">Using <strong>{provider_choice.capitalize()}</strong> · {model_choice}</div>',
                unsafe_allow_html=True,
            )
            st.markdown("")

        # Quick prompts
        st.markdown("**Quick questions:**")
        quick_cols = st.columns(4)
        quick_prompts = [
            "Summarise this meeting",
            "What are the action items?",
            "Who said what key points?",
            "What decisions were made?",
        ]
        for i, qp in enumerate(quick_prompts):
            with quick_cols[i]:
                if st.button(qp, key=f"quick_{i}", use_container_width=True):
                    st.session_state._pending_question = qp

        st.divider()

        # Chat history display
        chat_container = st.container()
        with chat_container:
            if not st.session_state.chat_history:
                st.markdown(
                    '<div style="text-align:center;color:#475569;padding:40px 0;">No messages yet. Ask something about your meeting!</div>',
                    unsafe_allow_html=True,
                )
            else:
                for turn in st.session_state.chat_history:
                    if turn["role"] == "user":
                        st.markdown(
                            f'<div class="chat-meta" style="text-align:right;">You</div>'
                            f'<div class="chat-user">{turn["content"]}</div>',
                            unsafe_allow_html=True,
                        )
                    else:
                        provider_label = turn.get("provider", "AI")
                        st.markdown(
                            f'<div class="chat-meta">🤖 {provider_label}</div>'
                            f'<div class="chat-ai">{turn["content"]}</div>',
                            unsafe_allow_html=True,
                        )

        # Input area
        st.markdown("---")
        col_input, col_send = st.columns([5, 1])
        with col_input:
            question = st.text_input(
                "Ask a question",
                key="qa_input",
                placeholder="e.g. What were the main decisions? Who is responsible for the backend?",
                label_visibility="collapsed",
            )
        with col_send:
            send_btn = st.button("Send ▶", type="primary", use_container_width=True)

        # Handle pending quick question
        if hasattr(st.session_state, "_pending_question"):
            question = st.session_state._pending_question
            del st.session_state._pending_question
            send_btn = True

        if send_btn and question and provider_choice and model_choice:
            # Add user turn
            st.session_state.chat_history.append({"role": "user", "content": question})

            with st.spinner(f"Thinking with {provider_choice}/{model_choice}..."):
                answer = ask_ai(
                    question=question,
                    transcript=st.session_state.transcript,
                    history=st.session_state.chat_history[:-1],
                    provider=provider_choice,
                    model=model_choice,
                    providers=providers,
                )

            st.session_state.chat_history.append({
                "role": "assistant",
                "content": answer,
                "provider": f"{provider_choice.capitalize()} / {model_choice}",
            })
            st.rerun()

        # Clear chat
        if st.session_state.chat_history:
            if st.button("🗑 Clear conversation", use_container_width=False):
                st.session_state.chat_history = []
                st.rerun()

# ────────────────────────────────────────────────────────────────────────────
# TAB 3 — Transcript Viewer
# ────────────────────────────────────────────────────────────────────────────
with tab3:
    if not st.session_state.transcript:
        st.info("No transcript yet.")
    else:
        col_a, col_b = st.columns([3, 1])
        with col_a:
            word_count = len(st.session_state.transcript.split())
            st.markdown(f"**{word_count:,} words** · {len(st.session_state.transcript_chunks)} chunk(s)")
        with col_b:
            st.download_button(
                "⬇ Download .txt",
                data=st.session_state.transcript,
                file_name=f"transcript_{datetime.now().strftime('%Y%m%d_%H%M')}.txt",
                mime="text/plain",
                use_container_width=True,
            )

        # Editable transcript
        edited = st.text_area(
            "Transcript (editable)",
            value=st.session_state.transcript,
            height=500,
            label_visibility="collapsed",
        )
        if edited != st.session_state.transcript:
            if st.button("💾 Save edits"):
                st.session_state.transcript = edited
                st.success("Saved!")

        # Per-chunk view
        if st.session_state.transcript_chunks:
            st.divider()
            st.markdown("#### Per-chunk transcript")
            for c in st.session_state.transcript_chunks:
                with st.expander(f"Chunk {c['index']} ({c['start_min']}–{c['end_min']} min)"):
                    st.write(c["text"])
