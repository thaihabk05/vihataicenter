import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models.database import init_db, async_session
from middleware.error_handler import error_handler_middleware
from middleware.logging_middleware import LoggingMiddleware

logger = logging.getLogger(__name__)


async def seed_admin():
    """Create default admin user if no users exist."""
    from models.user import User
    from sqlalchemy import select, func

    async with async_session() as db:
        result = await db.execute(select(func.count(User.id)))
        count = result.scalar() or 0
        if count == 0:
            from passlib.hash import bcrypt
            admin = User(
                name="Admin ViHAT",
                email="admin@vihat.vn",
                department="management",
                role="super_admin",
                password_hash=bcrypt.hash("vihat@2026"),
                knowledge_access=["sales", "hr", "accounting", "general", "management"],
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            logger.info("Created default admin user: admin@vihat.vn")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    try:
        await seed_admin()
    except Exception as e:
        logger.error(f"Seed admin failed (non-fatal): {e}")
    yield
    # Shutdown


app = FastAPI(
    title="ViHAT Knowledge Management System",
    description="Internal knowledge management API for ViHAT Group",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)
app.middleware("http")(error_handler_middleware)

# Routers
from routers import health, webhook, telegram, query, admin, knowledge, auth

app.include_router(health.router)
app.include_router(webhook.router, prefix="/api/v1/webhook", tags=["Webhook"])
app.include_router(telegram.router, prefix="/api/v1/webhook", tags=["Telegram"])
app.include_router(query.router, prefix="/api/v1", tags=["Query"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(knowledge.router, prefix="/api/v1/admin/knowledge", tags=["Knowledge"])
