from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from models.database import init_db
from routers import health, webhook, telegram, query, admin, knowledge, auth
from middleware.error_handler import error_handler_middleware
from middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
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
app.include_router(health.router)
app.include_router(webhook.router, prefix="/api/v1/webhook", tags=["Webhook"])
app.include_router(telegram.router, prefix="/api/v1/webhook", tags=["Telegram"])
app.include_router(query.router, prefix="/api/v1", tags=["Query"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(knowledge.router, prefix="/api/v1/admin/knowledge", tags=["Knowledge"])
