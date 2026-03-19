import logging
import traceback

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)

# SQLite needs special handling
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
    """Create all tables. Safe to call multiple times."""
    try:
        # Import all models so they register with Base.metadata
        from models.user import User  # noqa: F401
        from models.query_log import QueryLog  # noqa: F401
        from models.knowledge import KnowledgeDocument, Feedback  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.error(f"Database init error: {e}")
        logger.error(traceback.format_exc())
        # Don't raise - let the app start anyway, individual requests will fail with clear errors


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
