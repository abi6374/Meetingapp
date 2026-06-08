import os
import shutil
import subprocess
import tempfile
import logging
import io
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_audio_duration(audio_bytes: bytes) -> float:
    """Returns audio duration in seconds using pydub."""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        return len(audio) / 1000.0
    except Exception as e:
        logger.error(f"Error getting audio duration: {e}")
        return 0.0

def chunk_audio(audio_path: Path, chunk_minutes: int = 5) -> list[bytes]:
    """Split audio into N-minute WAV chunks using ffmpeg."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.warning("ffmpeg not found. Processing as single file.")
        with open(audio_path, "rb") as f:
            return [f.read()]

    output_dir = Path(tempfile.mkdtemp(prefix="meetingmind_chunks_"))
    segment_pattern = str(output_dir / "chunk_%03d.wav")
    segment_seconds = max(30, int(chunk_minutes * 60))

    command = [
        ffmpeg, "-y", "-i", str(audio_path), "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1", "-f", "segment",
        "-segment_time", str(segment_seconds), "-reset_timestamps", "1",
        segment_pattern,
    ]

    try:
        logger.info(f"Chunking audio: {audio_path} into {chunk_minutes}m segments")
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"FFmpeg failed: {result.stderr}")
            raise RuntimeError(result.stderr.strip() or "ffmpeg chunking failed")

        chunks = []
        for name in sorted(os.listdir(output_dir)):
            if not name.lower().endswith(".wav"):
                continue
            with open(output_dir / name, "rb") as chunk_file:
                chunks.append(chunk_file.read())

        logger.info(f"Created {len(chunks)} audio chunks")
        return chunks
    except Exception as e:
        logger.error(f"Chunking error: {str(e)}")
        with open(audio_path, "rb") as f:
            return [f.read()]
    finally:
        if output_dir.exists():
            shutil.rmtree(output_dir)
