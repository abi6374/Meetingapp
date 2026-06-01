import json
import os
import logging
from pathlib import Path
from typing import List, Optional
from app.models.meeting import Meeting
from app.core.config import settings

logger = logging.getLogger(__name__)

DB_PATH = settings.BASE_DIR / "db.json"

class LocalDB:
    def __init__(self):
        self._ensure_db()

    def _ensure_db(self):
        if not DB_PATH.exists():
            with open(DB_PATH, "w") as f:
                json.dump({"meetings": {}}, f)

    def _read_db(self) -> dict:
        try:
            with open(DB_PATH, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error("DB file corrupted, recreating.")
            self._ensure_db()
            return {"meetings": {}}

    def _write_db(self, data: dict):
        with open(DB_PATH, "w") as f:
            json.dump(data, f, indent=2)

    def save_meeting(self, meeting: Meeting):
        data = self._read_db()
        data["meetings"][meeting.id] = meeting.model_dump()
        self._write_db(data)

    def get_meeting(self, meeting_id: str) -> Optional[Meeting]:
        data = self._read_db()
        meeting_data = data["meetings"].get(meeting_id)
        if meeting_data:
            return Meeting(**meeting_data)
        return None

    def list_meetings(self) -> List[Meeting]:
        data = self._read_db()
        return [Meeting(**m) for m in data["meetings"].values()]

    def delete_meeting(self, meeting_id: str):
        data = self._read_db()
        if meeting_id in data["meetings"]:
            del data["meetings"][meeting_id]
            self._write_db(data)

db = LocalDB()
