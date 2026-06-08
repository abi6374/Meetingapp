import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from pydantic import model_validator
from typing import Self

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "MeetingMind API"
    SECRET_KEY: str = "supersecretkey"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:3000,https://meetingapp-two.vercel.app,https://d233h9ny7ketsg.cloudfront.net"
    
    # Storage
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    LOG_DIR: Path = BASE_DIR / "logs"
    
    # AI Providers
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    HF_TOKEN: str = ""
    OLLAMA_URL: str = "http://localhost:11434"
    LLM_PROVIDER: str = "groq"
    
    # Models
    WHISPER_MODEL: str = "base"
    EMBED_MODEL: str = "all-MiniLM-L6-v2"
    CHROMA_PATH: str = "./chroma_store"

    @model_validator(mode='after')
    def clean_env_vars(self) -> Self:
        """Automatically strip quotes and whitespace from all string environment variables."""
        for field_name in self.model_fields:
            value = getattr(self, field_name)
            if isinstance(value, str):
                cleaned_value = value.strip("\"' ")
                setattr(self, field_name, cleaned_value)
        return self

settings = Settings()

# Debugging: Log a preview of the key to ensure consistency across workers
key_preview = f"{settings.SECRET_KEY[:2]}...{settings.SECRET_KEY[-2:]}" if len(settings.SECRET_KEY) > 4 else "SHORT_KEY"
print(f"LOADED CONFIG: SECRET_KEY_PREVIEW={key_preview} (Length: {len(settings.SECRET_KEY)})")

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.LOG_DIR.mkdir(exist_ok=True)
