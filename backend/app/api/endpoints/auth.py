import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.domain import User
from app.schemas.auth import UserCreate, UserResponse, Token, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/signup", response_model=UserResponse)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        logger.warning(f"Signup attempt failed: Email {user_in.email} already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="This email is already registered. Please log in instead."
        )
        
    try:
        hashed_password = get_password_hash(user_in.password)
        new_user = User(
            email=user_in.email,
            hashed_password=hashed_password,
            full_name=user_in.full_name
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"New user created: {user_in.email}")
        return new_user
    except Exception as e:
        db.rollback()
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(subject=user.id)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(user_update: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.ai_provider is not None:
        current_user.ai_provider = user_update.ai_provider
    if user_update.password is not None and len(user_update.password) > 0:
        current_user.hashed_password = get_password_hash(user_update.password)
        
    db.commit()
    db.refresh(current_user)
    return current_user

