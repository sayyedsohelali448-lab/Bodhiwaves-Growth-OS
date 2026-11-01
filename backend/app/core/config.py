import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Bodhiwaves Growth OS"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", 8000))

    # Database Settings (Local / Render PostgreSQL - Primary)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://bodhiwaves:bodhiwaves123@127.0.0.1:5432/bodhiwaves_erp"
    )

    # MongoDB Atlas Settings (Secondary Document Database)
    MONGODB_URL: str = os.getenv("MONGODB_URL", os.getenv("MONGODB_URI", ""))
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "bodhiwaves_growth_os")

    # Redis Settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

    # Security & JWT Tokens
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "bodhiwaves_growth_os_enterprise_secret_key_2026_argon2_jwt_secure_key"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 2  # 2 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Origins (Localhost development & future production domains)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Meta WhatsApp Cloud API Placeholders
    WHATSAPP_ACCESS_TOKEN: str = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID: str = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_BUSINESS_ACCOUNT_ID: str = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
    WHATSAPP_VERIFY_TOKEN: str = os.getenv("WHATSAPP_VERIFY_TOKEN", "bodhiwaves_webhook_verify_token_2026")
    META_APP_SECRET: str = os.getenv("META_APP_SECRET", "")
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v21.0")
    WHATSAPP_MOCK_MODE: bool = os.getenv("WHATSAPP_MOCK_MODE", "true").lower() == "true"

    # Bootstrap Super Admin credentials
    BOOTSTRAP_SUPERADMIN_EMAIL: str = os.getenv("BOOTSTRAP_SUPERADMIN_EMAIL", "superadmin@bodhiwaves.com")
    BOOTSTRAP_SUPERADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_SUPERADMIN_PASSWORD", "")
    BOOTSTRAP_SUPERADMIN_NAME: str = os.getenv("BOOTSTRAP_SUPERADMIN_NAME", "Bodhiwaves Super Admin")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
