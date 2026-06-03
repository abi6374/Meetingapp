from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path
import os

# Database path logic
if os.environ.get("RENDER"):
    # Render persistent disk
    db_path = Path("/data/meetingmind.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"
    db_path.parent.mkdir(parents=True, exist_ok=True)
elif os.path.exists("/home/ubuntu/Meetingapp/backend"):
    # EC2 path
    BASE_DIR = Path("/home/ubuntu/Meetingapp/backend")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{BASE_DIR}/meetingmind.db"
else:
    # Local fallback
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
