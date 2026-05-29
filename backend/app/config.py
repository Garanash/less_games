from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./lessgame.db"
    jwt_secret: str = "change-me"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    frontend_url: str = "http://localhost:3000"
    backend_url: str = "http://localhost:8000"

    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "noreply@lessgame.local"

    storage_backend: str = "local"
    local_upload_dir: str = "./uploads"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "lessgame"
    s3_region: str = "us-east-1"
    s3_public_url: str = "http://localhost:9000/lessgame"

    email_verification_expire_hours: int = 24

    max_background_size: int = 10 * 1024 * 1024
    max_audio_size: int = 20 * 1024 * 1024
    max_character_size: int = 10 * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
