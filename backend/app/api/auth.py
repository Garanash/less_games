from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import User
from app.schemas import LoginRequest, MessageResponse, RegisterRequest, TokenResponse, UserResponse
from app.services.auth import (
    create_access_token,
    create_refresh_token,
    create_user,
    create_verification_token,
    decode_token,
    get_user_by_email,
    get_user_by_id,
    verify_email_token,
    verify_password,
)
from app.services.mailer import send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, user_id) -> None:
    response.set_cookie(
        key="access_token",
        value=create_access_token(user_id),
        httponly=True,
        samesite="lax",
        max_age=15 * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=create_refresh_token(user_id),
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    existing = await get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = await create_user(db, body.email, body.password)
    token_record = await create_verification_token(db, user)
    await db.commit()

    try:
        await send_verification_email(user.email, token_record.token)
    except Exception:
        import logging

        logging.getLogger(__name__).warning(
            "Verification email not sent for %s (SMTP unavailable). Token: %s",
            user.email,
            token_record.token,
        )
    return MessageResponse(message="Registration successful. Check your email to verify your account.")


@router.get("/verify-email", response_model=MessageResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    user = await verify_email_token(db, token)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token")
    await db.commit()
    return MessageResponse(message="Email verified successfully. You can now log in.")


@router.post("/login", response_model=UserResponse)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")

    _set_auth_cookies(response, user.id)
    return user


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
) -> TokenResponse:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    user_id = decode_token(refresh_token, "refresh")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    access = create_access_token(user.id)
    response.set_cookie(key="access_token", value=access, httponly=True, samesite="lax", max_age=15 * 60)
    return TokenResponse(access_token=access)


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response) -> MessageResponse:
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)) -> User:
    return user
