import logging
import traceback

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)

_is_sqlite = "sqlite" in settings.DATABASE_URL
connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db():
    """Create all tables using raw SQL with IF NOT EXISTS."""
    try:
        async with engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(36) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE,
                    department VARCHAR(50) NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'member',
                    password_hash VARCHAR(255),
                    zalo_id VARCHAR(100),
                    telegram_id BIGINT,
                    knowledge_access JSON,
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS query_logs (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) REFERENCES users(id),
                    channel VARCHAR(20) NOT NULL,
                    query_text TEXT NOT NULL,
                    answer_text TEXT,
                    department_routed VARCHAR(50),
                    sources JSON,
                    confidence_score FLOAT,
                    tokens_prompt INTEGER,
                    tokens_completion INTEGER,
                    processing_time_ms INTEGER,
                    feedback_rating INTEGER,
                    feedback_text TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS knowledge_documents (
                    id VARCHAR(36) PRIMARY KEY,
                    dify_document_id VARCHAR(100),
                    knowledge_base VARCHAR(50) NOT NULL,
                    title VARCHAR(500) NOT NULL,
                    file_name VARCHAR(255),
                    file_type VARCHAR(20),
                    file_size_bytes BIGINT,
                    tags JSON,
                    chunks_count INTEGER,
                    uploaded_by VARCHAR(36) REFERENCES users(id),
                    status VARCHAR(20) NOT NULL DEFAULT 'processing',
                    error_message TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS feedback (
                    id VARCHAR(36) PRIMARY KEY,
                    query_log_id VARCHAR(36) REFERENCES query_logs(id),
                    user_id VARCHAR(36) REFERENCES users(id),
                    rating INTEGER,
                    comment TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))
        logger.info("Database tables verified OK")
    except Exception as e:
        logger.error(f"Database init error: {e}")
        logger.error(traceback.format_exc())


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
