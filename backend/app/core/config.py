import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    APP_NAME: str = "MeetingMind API"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    
    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # AI Providers
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    
    # Render Free Tier Memory Optimization (512MB limit)
    # Using 'tiny' reduces RAM footprint from ~600MB to ~150MB
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny")
    
    class Config:
        env_file = ".env"

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.LOG_DIR.mkdir(exist_ok=True)
