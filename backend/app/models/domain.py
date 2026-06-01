from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, default="User")
    ai_provider = Column(String, default="groq")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    meetings = relationship("Meeting", back_populates="user", cascade="all, delete-orphan")

class Meeting(Base):
    __tablename__ = "meetings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String, index=True)
    date = Column(String, index=True)
    duration = Column(String, default="TBD")
    status = Column(String, default="processing", index=True)
    
    # Text Data
    raw_transcript = Column(Text, default="")
    speaker_transcript = Column(Text, default="")
    mom_text = Column(Text, default="")
    diarization_error = Column(String, nullable=True)
    
    # Store segments and speakers as JSON for simplicity, given SQLite constraints
    segments = Column(JSON, default=list)
    speakers = Column(JSON, default=list)
    
    # Soft Delete & Audit
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="meetings")
    chat_history = relationship("ChatHistory", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    participants = relationship("MeetingParticipant", back_populates="meeting", cascade="all, delete-orphan")

class ChatHistory(Base):
    __tablename__ = "chat_history"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    role = Column(String) # user or assistant
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="chat_history")

class ActionItem(Base):
    __tablename__ = "action_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    task = Column(Text)
    owner = Column(String, default="Unassigned")
    deadline = Column(String, nullable=True)
    status = Column(String, default="pending", index=True) # pending, completed
    is_deleted = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="action_items")

class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(String, ForeignKey("meetings.id"), index=True)
    name = Column(String, index=True)
    talk_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    meeting = relationship("Meeting", back_populates="participants")

