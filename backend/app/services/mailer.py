import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_verification_email(to_email: str, token: str) -> None:
    verify_url = f"{settings.frontend_url}/verify-email?token={token}"
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = "Подтверждение регистрации — Less Game Editor"
    message.set_content(
        f"Здравствуйте!\n\n"
        f"Подтвердите регистрацию, перейдя по ссылке:\n{verify_url}\n\n"
        f"Ссылка действительна 24 часа.\n"
    )

    try:
        await aiosmtplib.send(
            message,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user or None,
            password=settings.smtp_password or None,
            start_tls=False,
        )
    except Exception:
        logger.exception("Failed to send verification email to %s", to_email)
        raise
