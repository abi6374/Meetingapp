import logging
import tempfile
import os
from pathlib import Path
from functools import lru_cache
from app.core.config import settings

logger = logging.getLogger(__name__)

# Use a global variable to store the model to avoid re-loading
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading Whisper model: {settings.WHISPER_MODEL}")
            _whisper_model = WhisperModel(settings.WHISPER_MODEL, device="cpu", compute_type="int8")
        except Exception as e:
            logger.error(f"Failed to load Whisper: {str(e)}")
            return None
    return _whisper_model

def transcribe_chunk(audio_bytes: bytes, language: str = "auto") -> list[dict]:
    """Transcribe a single audio chunk."""
    model = get_whisper_model()
    if model is None:
        return [{"text": "[Whisper failed to load]", "start": 0.0, "end": 0.0}]

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_bytes)
        tmp_path = f.name

    try:
        kwargs = {}
        if language != "auto":
            kwargs["language"] = language

        segments, _ = model.transcribe(tmp_path, beam_size=5, **kwargs)
        out = []
        for seg in segments:
            out.append({"text": seg.text.strip(), "start": seg.start, "end": seg.end})
        return out
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return [{"text": f"[Transcription error: {e}]", "start": 0.0, "end": 0.0}]
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)
