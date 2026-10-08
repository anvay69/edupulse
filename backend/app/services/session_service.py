import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_session import UserSession

SESSION_DURATION = timedelta(hours=24)


def create_user_session(db: Session, user: User) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + SESSION_DURATION,
        )
    )
    db.commit()
    return token


def get_user_for_session(db: Session, token: str) -> User | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash,
            UserSession.expires_at > datetime.now(timezone.utc),
        )
    )
    if session is None:
        return None
    return db.get(User, session.user_id)
