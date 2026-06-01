from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

class MeetingSegment(BaseModel):
    start: float
    end: float
    text: str
    speaker: str = "Unknown Speaker"

class MeetingCreate(BaseModel):
    title: str
    date: str
    provider: str = "auto"
    model: str = ""

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    question: str
    history: List[ChatMessage] = []
    provider: str = "groq"
    model: str = "llama-3.3-70b-versatile"

class Meeting(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    date: str
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    status: str = "processing" # processing, completed, failed
    duration: str = "TBD"
    
    # Intelligence Data
    raw_transcript: str = ""
    speaker_transcript: str = ""
    segments: List[MeetingSegment] = []
    speakers: List[str] = []
    mom_text: str = ""
    
    # Error state
    diarization_error: Optional[str] = None
