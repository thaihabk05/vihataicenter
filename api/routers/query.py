from __future__ import annotations

import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.query_log import QueryLog
from services.auth_service import get_user_by_id
from services.dify_client import dify_client
from services.session_manager import session_manager
from services.query_router import query_router
from services.response_formatter import response_formatter
from middleware.rate_limiter import check_rate_limit
from utils.vietnamese_normalizer import vietnamese_normalizer

logger = logging.getLogger(__name__)

router = APIRouter()


class QueryRequest(BaseModel):
    user_id: str
    query: str
    department: str | None = None
    conversation_id: str | None = None
    options: dict | None = None


class QueryResponse(BaseModel):
    status: str
    answer: str
    sources: list
    conversation_id: str
    tokens_used: dict
    processing_time_ms: int


@router.post("/query", response_model=QueryResponse)
async def direct_query(
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """Direct query endpoint for Admin Panel or internal services."""
    start_time = time.perf_counter()

    # Validate user
    try:
        user_uuid = uuid.UUID(request.user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user_id format")

    user = await get_user_by_id(db, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await check_rate_limit(request.user_id)

    # Normalize query
    normalized_query = vietnamese_normalizer.normalize(request.query)

    # Route to KB
    if request.department:
        departments = [request.department]
    else:
        departments = await query_router.route(normalized_query, user)
    primary_dept = departments[0]

    # Call Dify
    dify_response = await dify_client.chat(
        query=normalized_query,
        department=primary_dept,
        conversation_id=request.conversation_id,
        user_id=request.user_id,
    )

    # Log query
    processing_time_ms = int((time.perf_counter() - start_time) * 1000)
    log = QueryLog(
        user_id=user.id,
        channel="web_admin",
        query_text=request.query,
        answer_text=dify_response["answer"],
        department_routed=primary_dept,
        sources=dify_response["sources"],
        confidence_score=dify_response["sources"][0]["score"]
        if dify_response["sources"]
        else None,
        tokens_prompt=dify_response["tokens"]["prompt"],
        tokens_completion=dify_response["tokens"]["completion"],
        processing_time_ms=processing_time_ms,
    )
    db.add(log)
    await db.commit()

    return QueryResponse(
        status="success",
        answer=dify_response["answer"],
        sources=dify_response["sources"],
        conversation_id=dify_response["conversation_id"],
        tokens_used=dify_response["tokens"],
        processing_time_ms=processing_time_ms,
    )
