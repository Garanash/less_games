import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import EmailVerificationToken, User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: UUID) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {"sub": str(user_id), "type": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def create_refresh_token(user_id: UUID) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {"sub": str(user_id), "type": "refresh", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_token(token: str, expected_type: str) -> UUID | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        if payload.get("type") != expected_type:
            return None
        return UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, email: str, password: str) -> User:
    user = User(email=email.lower(), password_hash=hash_password(password), is_verified=False)
    db.add(user)
    await db.flush()
    return user


async def create_verification_token(db: AsyncSession, user: User) -> EmailVerificationToken:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(UTC) + timedelta(hours=settings.email_verification_expire_hours)
    record = EmailVerificationToken(user_id=user.id, token=token, expires_at=expires_at)
    db.add(record)
    await db.flush()
    return record


async def verify_email_token(db: AsyncSession, token: str) -> User | None:
    result = await db.execute(
        select(EmailVerificationToken).where(EmailVerificationToken.token == token)
    )
    record = result.scalar_one_or_none()
    if not record or record.used_at is not None:
        return None
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=UTC)
    if expires_at < datetime.now(UTC):
        return None

    user = await get_user_by_id(db, record.user_id)
    if not user:
        return None

    user.is_verified = True
    record.used_at = datetime.now(UTC)
    await db.flush()
    return user


def user_to_dict(user: User) -> dict[str, Any]:
    return {"id": str(user.id), "email": user.email, "is_verified": user.is_verified}
