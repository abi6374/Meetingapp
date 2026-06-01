from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
import logging
import bcrypt

logger = logging.getLogger(__name__)

# --- MONKEYPATCH: Fix for passlib and bcrypt 4.x on Python 3.12 ---
# Passlib performs an internal self-test using a password of 73 bytes to check truncation.
# Bcrypt 4.x strictly forbids passwords > 72 bytes and throws a ValueError, crashing the app.
# We monkeypatch the bcrypt module to safely truncate all passwords to 72 bytes.
_original_hashpw = bcrypt.hashpw
def _patched_hashpw(password: bytes, salt: bytes) -> bytes:
    if len(password) > 72:
        password = password[:72]
    return _original_hashpw(password, salt)
bcrypt.hashpw = _patched_hashpw
# ------------------------------------------------------------------

from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60 * 24 * 7) # 7 days default for ease
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt



