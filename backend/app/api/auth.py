from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.user import LoginRequest, UserResponse
from app.services.session_service import create_user_session
from app.services.user_service import authenticate_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> UserResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        year=user.year,
        section=user.section,
        access_token=create_user_session(db, user),
    )
