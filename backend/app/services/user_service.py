import hashlib
import hmac
import json
import secrets
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole

_HASH_ITERATIONS = 310_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _HASH_ITERATIONS)
    return f"{salt.hex()}${digest.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt_hex, digest_hex = stored_hash.split("$", maxsplit=1)
        salt = bytes.fromhex(salt_hex)
        expected_digest = bytes.fromhex(digest_hex)
    except ValueError:
        return False

    actual_digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _HASH_ITERATIONS)
    return hmac.compare_digest(actual_digest, expected_digest)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


def seed_demo_users(db: Session) -> None:
    seed_file = Path(__file__).resolve().parents[3] / "demo_seed_data.json"
    demo_users = json.loads(seed_file.read_text(encoding="utf-8"))

    for demo_user in demo_users:
        existing_user = get_user_by_email(db, demo_user["email"])
        if existing_user is None:
            user_data = {
                "name": demo_user["username"],
                "email": demo_user["email"],
                "role": UserRole(demo_user["role"]),
                "department": demo_user.get("department"),
                "year": demo_user.get("year"),
                "section": demo_user.get("section"),
                "courses": demo_user.get("courses", []),
            }
            db.add(
                User(
                    **user_data,
                    password_hash=hash_password(demo_user["password"]),
                )
            )
        elif demo_user.get("courses") and not existing_user.courses:
            existing_user.courses = demo_user["courses"]
    db.commit()
