# ═══════════════════════════════════════════════════════════════════════════════
#  MeetingMind — Optimized Multi-Stage Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════
#
#  KEY OPTIMIZATIONS:
#   1. CPU-only PyTorch (--index-url cpu) — saves ~2.5 GB vs CUDA default
#   2. Optional diarization — pyannote.audio installed only via build arg
#   3. Multi-stage build — pip cache lives only in builder stage
#   4. Pyc cleanup — removes __pycache__ and .pyc files in final image
#   5. .dockerignore — excludes .git, __pycache__, etc. from build context
#   6. Pinned ctranslate2 — avoids falling back to CUDA-enabled version
#
#  ESTIMATED FINAL IMAGE SIZE:
#   - Without diarization: ~900 MB
#   - With diarization:    ~2.2 GB
#   - With CUDA torch:     ~4.5 GB (avoid this on EC2!)
# ═══════════════════════════════════════════════════════════════════════════════

# ── Build Argument ────────────────────────────────────────────────────────────
# Set to "true" to include speaker diarization (adds ~1.3 GB to image)
ARG ENABLE_DIARIZATION=false

# ═══════════════════════════════════════════════════════════════════════════════
#  STAGE 1 — Install Python Dependencies
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.12-slim AS builder

# ── Prevent Python from writing .pyc files ────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# ── Install system dependencies ───────────────────────────────────────────────
# ffmpeg is required for audio chunking (both with and without diarization)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# ── Copy requirements files ───────────────────────────────────────────────────
COPY requirements.txt .
COPY requirements-diarization.txt .

# ── Install core Python packages ──────────────────────────────────────────────
# This installs everything EXCEPT PyTorch/pyannote:
#   FastAPI, faster-whisper, Groq, Gemini, SQLAlchemy, etc.
# faster-whisper uses CTranslate2 — it does NOT need PyTorch!
# --only-binary :all: prevents source builds (saves temp space during install)
RUN pip install --no-cache-dir --only-binary :all: -r requirements.txt

# ── Conditionally install diarization packages ────────────────────────────────
# PyTorch is ONLY needed for speaker diarization (pyannote.audio).
# Without it, the app runs perfectly — diarization falls back gracefully.
ARG ENABLE_DIARIZATION
RUN if [ "$ENABLE_DIARIZATION" = "true" ]; then \
        echo "Installing PyTorch (CPU-only) + pyannote.audio for speaker diarization..." && \
        # CPU-only PyTorch — without this flag, pip installs 2.5 GB of CUDA libraries!
        pip install --no-cache-dir --only-binary :all: torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
        pip install --no-cache-dir --only-binary :all: -r requirements-diarization.txt; \
    else \
        echo "Skipping speaker diarization (ENABLE_DIARIZATION != true). Saves ~1.3 GB."; \
    fi

# ═══════════════════════════════════════════════════════════════════════════════
#  STAGE 2 — Final Production Image
# ═══════════════════════════════════════════════════════════════════════════════
FROM python:3.12-slim

# ── Prevent .pyc files ────────────────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# ── Install runtime system deps only ──────────────────────────────────────────
# Only ffmpeg is needed at runtime (for audio chunking)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# ── Copy installed Python packages from builder ───────────────────────────────
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# ── Clean up __pycache__ and .pyc files — saves ~50-100 MB ───────────────────
RUN find /usr/local/lib/python3.12/site-packages -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true && \
    find /usr/local/lib/python3.12/site-packages -type f -name "*.pyc" -delete 2>/dev/null || true

# ── Create data directory for SQLite persistence ──────────────────────────────
RUN mkdir -p /data && chmod 777 /data

# ── Copy application code ─────────────────────────────────────────────────────
COPY . .

# ── Expose API port ───────────────────────────────────────────────────────────
EXPOSE 8000

# ── Health check (uses Python stdlib — no curl needed) ────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# ── Run with reduced startup time ─────────────────────────────────────────────
# --no-server-header removes version leak
# --workers 1 prevents OOM on small instances
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-server-header"]
