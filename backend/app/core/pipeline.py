import logging
import time
from pathlib import Path
from typing import Dict, Any

from app.services.audio import chunk_audio, get_audio_duration
from app.services.transcription import transcribe_chunk
from app.services.diarization import run_diarization

logger = logging.getLogger(__name__)

def map_segments_to_speakers(segments: list, diarization: list, unknown_label: str = "Unknown Speaker") -> list:
    if not diarization:
        for s in segments: s["speaker"] = unknown_label
        return segments

    for s in segments:
        s_start, s_end = s.get("start", 0.0), s.get("end", 0.0)
        best_sp, best_overlap = unknown_label, 0.0
        seg_dur = max(0.0, s_end - s_start)
        for d in diarization:
            overlap = max(0.0, min(s_end, d.get("end", 0.0)) - max(s_start, d.get("start", 0.0)))
            if overlap > best_overlap:
                best_overlap = overlap
                best_sp = d.get("speaker", unknown_label)

        if seg_dur > 0 and best_overlap / seg_dur < 0.2:
            s["speaker"] = unknown_label
        else:
            s["speaker"] = best_sp
    return segments

def process_meeting_audio(audio_path: Path, language: str = "auto", enable_diarization: bool = True) -> Dict[str, Any]:
    """Orchestrates the entire audio processing pipeline."""
    logger.info(f"Starting pipeline for {audio_path.name}")
    start_time = time.time()
    
    # Read audio bytes for diarization before chunking
    with open(audio_path, "rb") as f:
        audio_bytes = f.read()

    # 1. Chunking
    chunks = chunk_audio(audio_path, chunk_minutes=5)
    
    # 2. Transcription with cumulative offset
    total_segments = []
    current_offset = 0.0
    for i, chunk in enumerate(chunks):
        logger.info(f"Transcribing chunk {i+1}/{len(chunks)}")
        segs = transcribe_chunk(chunk, language=language)
        
        # Adjust timestamps for the chunk offset
        for s in segs:
            s["start"] += current_offset
            s["end"] += current_offset
            
        total_segments.extend(segs)
        
        # Update offset based on actual chunk duration
        chunk_duration = get_audio_duration(chunk)
        current_offset += chunk_duration

    # 3. Diarization (Optional / Graceful Fallback)
    speakers = []
    diarization_data = None
    diarization_error = None
    
    if enable_diarization:
        logger.info("Starting Diarization phase...")
        diar_result, error = run_diarization(audio_bytes)
        if diar_result:
            diarization_data = diar_result["segments"]
            speakers = diar_result["speakers"]
            total_segments = map_segments_to_speakers(total_segments, diarization_data)
        else:
            diarization_error = error
            logger.warning(f"Diarization fallback triggered: {error}")
            total_segments = map_segments_to_speakers(total_segments, [])

    # 4. Final Transcript Construction
    transcript_text = "\n\n".join(s.get("text", "") for s in total_segments)
    
    # Format speaker transcript
    formatted_lines = []
    for s in sorted(total_segments, key=lambda x: x.get("start", 0.0)):
        start = int(s.get("start", 0.0))
        ts = f"{start // 3600:02d}:{(start % 3600) // 60:02d}:{start % 60:02d}"
        sp = s.get("speaker", "Unknown Speaker")
        formatted_lines.append(f"[{ts}] {sp}: {s.get('text', '').replace(chr(10), ' ')}")
        
    speaker_transcript = "\n".join(formatted_lines)

    processing_time = time.time() - start_time
    logger.info(f"Pipeline completed in {processing_time:.2f} seconds")

    return {
        "status": "completed",
        "processing_time": processing_time,
        "raw_transcript": transcript_text,
        "speaker_transcript": speaker_transcript,
        "segments": total_segments,
        "speakers": speakers,
        "diarization_error": diarization_error
    }
