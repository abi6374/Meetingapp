import shutil
import logging
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from pathlib import Path
import os
from typing import List

from app.core.config import settings
from app.core.pipeline import process_meeting_audio
from app.db.database import get_db, SessionLocal
from app.models.domain import Meeting as DBMeeting, User
from app.models.meeting import ChatRequest # Reusing the pydantic schema
from app.services.intelligence import generate_mom
from app.services.ai_service import ask_ai
from app.services.export import export_pdf, export_docx
from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

def get_user_dir(user_id: str, dir_type: str) -> Path:
    """Returns and ensures a user-specific directory exists."""
    base = settings.UPLOAD_DIR if dir_type == "uploads" else settings.BASE_DIR / "exports"
    user_dir = base / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir

def background_process_audio(meeting_id: str, file_path: Path, user_id: str):
    """Background task to process audio, transcribe, diarize, and generate MoM."""
    db = SessionLocal()
    meeting = db.query(DBMeeting).filter(DBMeeting.id == meeting_id).first()
    if not meeting:
        db.close()
        return

    try:
        # 1. Run Pipeline (Chunking, Whisper, Diarization)
        result = process_meeting_audio(file_path)
        
        meeting.raw_transcript = result["raw_transcript"]
        meeting.speaker_transcript = result["speaker_transcript"]
        meeting.segments = result["segments"]
        meeting.speakers = result["speakers"]
        meeting.diarization_error = result["diarization_error"]
        
        # 2. Intelligence Extraction (MOM)
        # Use provider chosen by user or default
        user = db.query(User).filter(User.id == user_id).first()
        provider = user.ai_provider if user else "groq"
        model = "llama-3.3-70b-versatile" if provider == "groq" else "gemini-1.5-flash" if provider == "gemini" else "llama3"

        speakers_str = ", ".join(meeting.speakers) if meeting.speakers else "TBD"
        mom_text = generate_mom(
            title=meeting.title,
            date=meeting.date,
            duration=meeting.duration,
            speakers=speakers_str,
            transcript=meeting.speaker_transcript or meeting.raw_transcript,
            provider=provider,
            model=model
        )
        meeting.mom_text = mom_text
        meeting.status = "completed"
        
        db.commit()
        logger.info(f"Meeting {meeting_id} processing completed successfully.")

    except Exception as e:
        logger.error(f"Background processing failed for {meeting_id}: {e}")
        meeting.status = "failed"
        db.commit()
    finally:
        db.close()
        if file_path.exists():
            os.unlink(file_path)

@router.post("/upload")
async def upload_meeting(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    date: str = Form(...),
    duration: str = Form("TBD"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    meeting = DBMeeting(
        user_id=current_user.id,
        title=title,
        date=date,
        duration=duration
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    
    user_upload_dir = get_user_dir(current_user.id, "uploads")
    file_path = user_upload_dir / f"{meeting.id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(background_process_audio, str(meeting.id), file_path, current_user.id)
    return {"message": "Upload successful. Processing started.", "meeting_id": str(meeting.id)}

from pydantic import BaseModel
from typing import Optional

class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    raw_transcript: Optional[str] = None
    speaker_transcript: Optional[str] = None
    mom_text: Optional[str] = None

@router.get("/")
async def list_meetings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(DBMeeting).filter(
        DBMeeting.user_id == current_user.id,
        DBMeeting.is_deleted == False
    ).order_by(DBMeeting.created_at.desc()).all()

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(DBMeeting).filter(
        DBMeeting.id == meeting_id, 
        DBMeeting.user_id == current_user.id,
        DBMeeting.is_deleted == False
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting

@router.put("/{meeting_id}")
async def update_meeting(meeting_id: str, update_data: MeetingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(DBMeeting).filter(
        DBMeeting.id == meeting_id, 
        DBMeeting.user_id == current_user.id,
        DBMeeting.is_deleted == False
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(meeting, key, value)
        
    db.commit()
    db.refresh(meeting)
    return meeting

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(DBMeeting).filter(
        DBMeeting.id == meeting_id, 
        DBMeeting.user_id == current_user.id
    ).first()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    # Soft delete
    meeting.is_deleted = True
    db.commit()
    return {"message": "Meeting deleted successfully"}

@router.post("/{meeting_id}/chat")
async def chat_with_meeting(meeting_id: str, request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(DBMeeting).filter(DBMeeting.id == meeting_id, DBMeeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    transcript = meeting.speaker_transcript or meeting.raw_transcript
    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript not ready yet")
        
    response = ask_ai(
        question=request.question,
        transcript=transcript,
        history=[m.model_dump() for m in request.history],
        provider=request.provider,
        model=request.model
    )
    return {"reply": response}

@router.get("/{meeting_id}/export")
async def export_meeting(meeting_id: str, fmt: str = "txt", db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(DBMeeting).filter(DBMeeting.id == meeting_id, DBMeeting.user_id == current_user.id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.mom_text:
        raise HTTPException(status_code=400, detail="Minutes of Meeting not ready yet")
        
    if fmt == "pdf":
        pdf_bytes = export_pdf(meeting.mom_text)
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=MeetingMind_{meeting_id}.pdf"})
    elif fmt == "docx":
        docx_bytes = export_docx(meeting.mom_text)
        return Response(content=docx_bytes, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition": f"attachment; filename=MeetingMind_{meeting_id}.docx"})
    else: # txt
        return Response(content=meeting.mom_text, media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=MeetingMind_{meeting_id}.txt"})

