from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # FastAPI Server
    APP_ENV: str = "development"
    APP_PORT: int = 8000
    APP_HOST: str = "0.0.0.0"
    SECRET_KEY: str = "change-me-in-production"
    LOG_LEVEL: str = "INFO"

    # Dify Configuration
    DIFY_BASE_URL: str = "http://localhost:80/v1"
    DIFY_CONSOLE_URL: str = "http://localhost:80"
    DIFY_API_KEY_SALES: str = ""
    DIFY_API_KEY_HR: str = ""
    DIFY_API_KEY_ACCOUNTING: str = ""
    DIFY_API_KEY_GENERAL: str = ""
    DIFY_API_KEY_MANAGEMENT: str = ""
    DIFY_DATASET_API_KEY: str = ""

    # Dify Dataset IDs (Knowledge Base IDs in Dify)
    DIFY_DATASET_ID_SALES: str = ""
    DIFY_DATASET_ID_HR: str = ""
    DIFY_DATASET_ID_ACCOUNTING: str = ""
    DIFY_DATASET_ID_GENERAL: str = ""
    DIFY_DATASET_ID_MANAGEMENT: str = ""

    # Claude API
    ANTHROPIC_API_KEY: str = ""

    # OpenAI API (Phase 1 Embedding)
    OPENAI_API_KEY: str = ""

    # Database (default: SQLite for dev/Railway, PostgreSQL for production VPS)
    DATABASE_URL: str = "sqlite+aiosqlite:///./vihat_knowledge.db"

    # Redis (optional - gracefully degrades if not available)
    REDIS_URL: str = ""

    # OmiFlow Webhook
    OMIFLOW_WEBHOOK_SECRET: str = ""
    OMIFLOW_API_URL: str = "https://api.omiflow.vn"
    OMIFLOW_API_KEY: str = ""

    # Telegram Bot
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBHOOK_URL: str = ""

    # File Upload
    UPLOAD_DIR: str = "/data/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30
    RATE_LIMIT_PER_DAY: int = 500

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
