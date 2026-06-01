from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import os

# Render persistent disk or local fallback
if os.environ.get("RENDER"):
    # Store the database in the dedicated persistent /data folder
    SQLALCHEMY_DATABASE_URL = "sqlite:////data/meetingmind.db"
else:
    # Local development path
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{BASE_DIR}/meetingmind.db"

print(f"DATABASE_URL: {SQLALCHEMY_DATABASE_URL}")

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
