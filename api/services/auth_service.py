from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, Request
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import get_db
from models.user import User

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Permission matrix
PERMISSIONS = {
    "super_admin": {
        "query_all_kb", "query_own_kb", "query_general",
        "upload_document", "delete_document",
        "manage_users", "view_all_stats", "view_own_stats",
        "configure_system",
    },
    "admin": {
        "query_all_kb", "query_own_kb", "query_general",
        "upload_document", "delete_document",
        "manage_users", "view_all_stats", "view_own_stats",
    },
    "lead": {
        "query_own_kb", "query_general",
        "upload_document",
        "view_own_stats",
    },
    "member": {
        "query_own_kb", "query_general",
        "view_own_stats",
    },
    "viewer": {
        "query_own_kb", "query_general",
    },
}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def has_permission(role: str, permission: str) -> bool:
    role_perms = PERMISSIONS.get(role, set())
    return permission in role_perms


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency: extract and validate JWT from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    token = auth_header.split(" ", 1)[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Token đã hết hạn hoặc không hợp lệ")

    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise HTTPException(status_code=401, detail="Token không hợp lệ")

    result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Người dùng không tồn tại")

    return user


async def get_user_by_zalo_id(db: AsyncSession, zalo_id: str) -> User | None:
    result = await db.execute(select(User).where(User.zalo_id == zalo_id, User.is_active))
    return result.scalar_one_or_none()


async def get_user_by_telegram_id(db: AsyncSession, telegram_id: int) -> User | None:
    result = await db.execute(
        select(User).where(User.telegram_id == telegram_id, User.is_active)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()
