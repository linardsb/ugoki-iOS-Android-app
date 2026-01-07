from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "UGOKI API"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    # Database
    # SQLite (dev default): sqlite+aiosqlite:///./ugoki.db
    # PostgreSQL: postgresql+asyncpg://user:pass@localhost:5432/ugoki
    database_url: str = "sqlite+aiosqlite:///./ugoki.db"

    # PostgreSQL connection pool settings (ignored for SQLite)
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    # Security
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    # AI Provider Configuration
    # Options: "ollama" (free/local), "groq" (free tier), "anthropic", "openai"
    ai_provider: Literal["ollama", "groq", "anthropic", "openai", "mock"] = "ollama"

    # Ollama (free, local) - default
    # Install: https://ollama.ai then run: ollama pull llama3.2
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"

    # Groq (free tier available) - https://console.groq.com
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-70b-versatile"

    # Anthropic (paid) - only if you want to use Claude
    anthropic_api_key: str = ""

    # OpenAI (paid)
    openai_api_key: str = ""

    # External Services
    logfire_token: str = ""
    resend_api_key: str = ""
    expo_access_token: str = ""

    # Cloudflare R2 Storage
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "ugoki-assets"
    r2_public_url: str = ""  # e.g., https://pub-xxx.r2.dev


settings = Settings()
