import logging
import platform
import shutil
import subprocess
import tempfile
import os
import traceback
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── torchaudio Monkeypatch ────────────────────────────────────────────────────
try:
    import torchaudio
    if not hasattr(torchaudio, "set_audio_backend"):
        torchaudio.set_audio_backend = lambda x: None
        logger.info("Applied monkeypatch for torchaudio.set_audio_backend")
except Exception as e:
    logger.debug(f"Could not load or patch torchaudio: {e}")


def run_diarization(audio_bytes: bytes) -> tuple[dict | None, str | None]:
    """Robust speaker diarization with strict dependency validation."""
    hf_token = settings.HF_TOKEN
    if not hf_token:
        logger.warning("Diarization skipped: HF_TOKEN missing")
        return None, "HF_TOKEN not set."

    # 1. System Level Dependency Checks (Before Imports)
    if platform.system() == "Linux":
        if not shutil.which("ffmpeg"):
            logger.warning("Missing ffmpeg executable.")
            return None, "System Error: Missing ffmpeg."
        
        try:
            res = subprocess.run(["ldconfig", "-p"], capture_output=True, text=True)
            if "libavutil" not in res.stdout:
                logger.warning("Missing libavutil shared library.")
                return None, "System Error: Missing libavutil."
        except Exception as e:
            logger.debug(f"ldconfig check failed: {e}")

    # 2. Python Level Dependency Checks
    try:
        import torch
        import torchaudio
        try:
            import torchcodec
        except Exception as e:
            logger.warning(f"Optional torchcodec not loaded: {e}. Diarization will proceed without it.")

        import pyannote.audio
        from pyannote.audio import Pipeline
        from huggingface_hub import login
    except ImportError as e:
        logger.warning(f"Diarization dependencies missing: {e}")
        return None, "Diarization disabled: missing Python dependencies."
    except Exception as e:
        logger.warning(f"Unexpected dependency error: {e}")
        return None, "Diarization disabled due to environment issue."

    # 3. Execution
    try:
        logger.info(f"Initializing PyAnnote pipeline (pyannote.audio {pyannote.audio.__version__})")
        login(token=hf_token)

        pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            use_auth_token=hf_token
        )
        
        if torch.cuda.is_available():
            pipeline.to(torch.device("cuda"))
            logger.info("Using CUDA for diarization")
        else:
            logger.info("Using CPU for diarization")

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            wav_path = f.name

        logger.info(f"Running diarization on {len(audio_bytes)} bytes...")
        diar_result = pipeline(wav_path)
        
        diar_segments = []
        speakers = []
        for turn, track, speaker in diar_result.itertracks(yield_label=True):
            diar_segments.append({"start": turn.start, "end": turn.end, "speaker": speaker})
            speakers.append(speaker)
        
        try: os.unlink(wav_path)
        except: pass
        
        logger.info(f"Diarization complete: found {len(set(speakers))} speakers")
        return {"segments": diar_segments, "speakers": sorted(set(speakers))}, None

    except Exception as e:
        err_msg = str(e)
        logger.warning(f"Diarization execution failed: {err_msg}")
        logger.debug("Diarization traceback:\n" + traceback.format_exc())
        
        if "403" in err_msg or "gated" in err_msg.lower():
            return None, "Access Denied: Please accept terms on Hugging Face."
        elif "token" in err_msg.lower():
            return None, "Invalid HF_TOKEN."
        return None, "Diarization failed during processing."
