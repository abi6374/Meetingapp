import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.db.database import get_db
from app.models.domain import User
from app.core.config import settings
from app.core.security import ALGORITHM

logger = logging.getLogger(__name__)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Debugging flag to log key info only once
_key_logged = False

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    global _key_logged
    
    if not _key_logged:
        logger.info(f"AUTH DEBUG: Secret Key Length: {len(settings.SECRET_KEY)}")
        _key_logged = True
        
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        if not token:
            logger.warning("No token found in request headers")
            raise credentials_exception
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("Token payload missing 'sub' claim")
            raise credentials_exception
    except JWTError as e:
        logger.error(f"JWT Decode Error: {e}")
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        logger.warning(f"No user found for ID: {user_id}")
        raise credentials_exception
    return user
