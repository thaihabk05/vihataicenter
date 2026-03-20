from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.user import User
from models.query_log import QueryLog
from services.auth_service import hash_password

router = APIRouter()


# === User Management ===


class UserCreate(BaseModel):
    name: str
    email: str | None = None
    department: str
    role: str = "member"
    password: str | None = None
    zalo_id: str | None = None
    telegram_id: int | None = None
    knowledge_access: list[str] = []


class UserUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    department: str | None = None
    role: str | None = None
    zalo_id: str | None = None
    telegram_id: int | None = None
    knowledge_access: list[str] | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str | None
    department: str
    role: str
    zalo_id: str | None
    telegram_id: int | None
    knowledge_access: list[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user."""
    user = User(
        name=user_data.name,
        email=user_data.email,
        department=user_data.department,
        role=user_data.role,
        password_hash=hash_password(user_data.password) if user_data.password else None,
        zalo_id=user_data.zalo_id,
        telegram_id=user_data.telegram_id,
        knowledge_access=user_data.knowledge_access,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        department=user.department,
        role=user.role,
        zalo_id=user.zalo_id,
        telegram_id=user.telegram_id,
        knowledge_access=user.knowledge_access or [],
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    department: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all users, optionally filtered by department."""
    stmt = select(User)
    if department:
        stmt = stmt.where(User.department == department)
    stmt = stmt.order_by(User.created_at.desc())

    result = await db.execute(stmt)
    users = result.scalars().all()
    return [
        UserResponse(
            id=str(u.id),
            name=u.name,
            email=u.email,
            department=u.department,
            role=u.role,
            zalo_id=u.zalo_id,
            telegram_id=u.telegram_id,
            knowledge_access=u.knowledge_access or [],
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update user details."""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    return UserResponse(
        id=str(user.id),
        name=user.name,
        email=user.email,
        department=user.department,
        role=user.role,
        zalo_id=user.zalo_id,
        telegram_id=user.telegram_id,
        knowledge_access=user.knowledge_access or [],
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete user (set is_active=False)."""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok", "message": f"User {user.name} deactivated"}


# === Stats ===


@router.get("/stats")
async def get_stats(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
):
    """Get usage statistics."""
    since = datetime.utcnow() - timedelta(days=days)

    # Total queries
    total_result = await db.execute(
        select(func.count(QueryLog.id)).where(QueryLog.created_at >= since)
    )
    total_queries = total_result.scalar() or 0

    # By department
    dept_result = await db.execute(
        select(QueryLog.department_routed, func.count(QueryLog.id))
        .where(QueryLog.created_at >= since)
        .group_by(QueryLog.department_routed)
    )
    by_department = {row[0]: row[1] for row in dept_result if row[0]}

    # By channel
    channel_result = await db.execute(
        select(QueryLog.channel, func.count(QueryLog.id))
        .where(QueryLog.created_at >= since)
        .group_by(QueryLog.channel)
    )
    by_channel = {row[0]: row[1] for row in channel_result}

    # Avg response time
    avg_time_result = await db.execute(
        select(func.avg(QueryLog.processing_time_ms)).where(
            QueryLog.created_at >= since
        )
    )
    avg_response_time = int(avg_time_result.scalar() or 0)

    # Avg confidence
    avg_conf_result = await db.execute(
        select(func.avg(QueryLog.confidence_score)).where(
            QueryLog.created_at >= since, QueryLog.confidence_score.isnot(None)
        )
    )
    avg_confidence = round(float(avg_conf_result.scalar() or 0), 2)

    # Token usage
    tokens_result = await db.execute(
        select(
            func.sum(QueryLog.tokens_prompt),
            func.sum(QueryLog.tokens_completion),
        ).where(QueryLog.created_at >= since)
    )
    tokens_row = tokens_result.one()
    total_tokens = (tokens_row[0] or 0) + (tokens_row[1] or 0)

    return {
        "period": f"{since.date()} to {datetime.utcnow().date()}",
        "total_queries": total_queries,
        "by_department": by_department,
        "by_channel": by_channel,
        "avg_response_time_ms": avg_response_time,
        "avg_confidence_score": avg_confidence,
        "tokens_used": {
            "total": total_tokens,
            "prompt": tokens_row[0] or 0,
            "completion": tokens_row[1] or 0,
        },
    }


# === Query Logs ===


@router.get("/logs")
async def list_logs(
    page: int = 1,
    limit: int = 20,
    channel: str | None = None,
    department: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List query logs with pagination and filters."""
    from models.query_log import QueryLog
    from models.user import User

    # Count total
    count_stmt = select(func.count(QueryLog.id))
    if channel:
        count_stmt = count_stmt.where(QueryLog.channel == channel)
    if department:
        count_stmt = count_stmt.where(QueryLog.department_routed == department)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Fetch page with user name join
    stmt = (
        select(QueryLog, User.name.label("user_name"))
        .outerjoin(User, QueryLog.user_id == User.id)
        .order_by(QueryLog.created_at.desc())
    )
    if channel:
        stmt = stmt.where(QueryLog.channel == channel)
    if department:
        stmt = stmt.where(QueryLog.department_routed == department)

    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        log = row[0]  # QueryLog
        user_name = row[1]  # User.name
        items.append({
            "id": str(log.id),
            "user_id": str(log.user_id) if log.user_id else None,
            "user_name": user_name,
            "channel": log.channel,
            "query_text": log.query_text,
            "answer_text": log.answer_text,
            "department_routed": log.department_routed,
            "sources": log.sources,
            "confidence_score": log.confidence_score,
            "tokens_prompt": log.tokens_prompt,
            "tokens_completion": log.tokens_completion,
            "processing_time_ms": log.processing_time_ms,
            "feedback_rating": log.feedback_rating,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    pages = (total + limit - 1) // limit if total > 0 else 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


# === Query Logs ===


class QueryLogResponse(BaseModel):
    id: str
    user_id: str | None
    user_name: str | None = None
    channel: str
    query_text: str
    answer_text: str | None
    department_routed: str | None
    sources: dict | list | None
    confidence_score: float | None
    tokens_prompt: int | None
    tokens_completion: int | None
    processing_time_ms: int | None
    feedback_rating: int | None
    created_at: datetime


@router.get("/logs")
async def list_logs(
    page: int = 1,
    limit: int = 20,
    channel: str | None = None,
    department: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List query logs with pagination and filters."""
    stmt = (
        select(QueryLog, User.name.label("user_name"))
        .outerjoin(User, QueryLog.user_id == User.id)
    )

    if channel:
        stmt = stmt.where(QueryLog.channel == channel)
    if department:
        stmt = stmt.where(QueryLog.department_routed == department)
    if date_from:
        stmt = stmt.where(QueryLog.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        stmt = stmt.where(QueryLog.created_at <= datetime.fromisoformat(date_to))

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Paginate
    offset = (page - 1) * limit
    stmt = stmt.order_by(QueryLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()

    logs = []
    for row in rows:
        log = row[0]  # QueryLog object
        user_name = row[1]  # user_name from join
        logs.append(
            QueryLogResponse(
                id=str(log.id),
                user_id=str(log.user_id) if log.user_id else None,
                user_name=user_name,
                channel=log.channel,
                query_text=log.query_text,
                answer_text=log.answer_text,
                department_routed=log.department_routed,
                sources=log.sources,
                confidence_score=log.confidence_score,
                tokens_prompt=log.tokens_prompt,
                tokens_completion=log.tokens_completion,
                processing_time_ms=log.processing_time_ms,
                feedback_rating=log.feedback_rating,
                created_at=log.created_at,
            )
        )

    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }
