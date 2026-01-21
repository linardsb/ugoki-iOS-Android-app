from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import Literal, Self


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

    # Environment - controls security validation and CORS behavior
    # Set ENVIRONMENT=production in production deployments
    environment: Literal["development", "staging", "production"] = "development"

    # CORS Origins - list of allowed origins for cross-origin requests
    # In development, empty list allows all origins (*)
    # In production, this MUST be set to specific origins
    # Example: CORS_ORIGINS='["https://app.ugoki.com", "https://ugoki.com"]'
    cors_origins: list[str] = []

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

    # ============ Pydantic AI Agent Configuration ============
    # These override ai_provider settings for the streaming coach

    # LLM Configuration (for streaming responses)
    llm_provider: str = ""  # openai, ollama, groq, anthropic (defaults to ai_provider if empty)
    llm_api_key: str = ""   # API key for LLM provider
    llm_choice: str = ""    # Model name (e.g., gpt-4o-mini, llama3.2)
    llm_base_url: str = ""  # Base URL for API (e.g., https://api.openai.com/v1)

    # Embedding Configuration (for RAG)
    embedding_provider: str = "openai"  # openai or ollama
    embedding_api_key: str = ""         # API key for embeddings
    embedding_model_choice: str = "text-embedding-3-small"  # Embedding model
    embedding_base_url: str = "https://api.openai.com/v1"   # Base URL

    # Web Search
    brave_api_key: str = ""  # Brave Search API key (optional)

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

    @model_validator(mode="after")
    def validate_production_settings(self) -> Self:
        """
        Fail fast if production environment is misconfigured.

        This prevents deploying to production with insecure defaults:
        - JWT_SECRET must be changed from the default value
        - CORS_ORIGINS must be explicitly configured

        Generate a secure JWT secret with: openssl rand -hex 32
        """
        if self.environment == "production":
            if self.jwt_secret == "change-me-in-production":
                raise ValueError(
                    "CRITICAL: JWT_SECRET must be changed in production! "
                    "Generate a secure secret with: openssl rand -hex 32"
                )
            if not self.cors_origins:
                raise ValueError(
                    "CORS_ORIGINS must be set in production. "
                    'Example: CORS_ORIGINS=\'["https://app.ugoki.com"]\''
                )
        return self


settings = Settings()
