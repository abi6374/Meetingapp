import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "MeetingMind API"
    
    # Securely load and clean the SECRET_KEY
    # We strip quotes to prevent "Signature verification failed" errors
    SECRET_KEY: str = str(os.getenv("SECRET_KEY", "supersecretkey")).strip("\"' ")
    
    DEBUG: bool = str(os.getenv("DEBUG", "True")).lower() == "true"
    
    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # AI Providers (Cleaned)
    GROQ_API_KEY: str = str(os.getenv("GROQ_API_KEY", "")).strip("\"' ")
    GEMINI_API_KEY: str = str(os.getenv("GEMINI_API_KEY", "")).strip("\"' ")
    HF_TOKEN: str = str(os.getenv("HF_TOKEN", "")).strip("\"' ")
    OLLAMA_URL: str = str(os.getenv("OLLAMA_URL", "http://localhost:11434")).strip("\"' ")
    
    # Models
    WHISPER_MODEL: str = str(os.getenv("WHISPER_MODEL", "tiny")).strip("\"' ")
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.LOG_DIR.mkdir(exist_ok=True)
