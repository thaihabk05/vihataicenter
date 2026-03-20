from __future__ import annotations

import hashlib
import hmac
import logging
import time
import uuid

from fastapi import APIRouter, Request, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import get_db
from models.query_log import QueryLog
from services.auth_service import get_user_by_zalo_id
from services.dify_client import dify_client
from services.session_manager import session_manager
from services.query_router import query_router
from services.response_formatter import response_formatter
from services.notification import notification_service
from middleware.rate_limiter import check_rate_limit
from utils.vietnamese_normalizer import vietnamese_normalizer
from utils.helpers import detect_command, HELP_TEXT

logger = logging.getLogger(__name__)

router = APIRouter()


class OmiFlowMessage(BaseModel):
    type: str = "text"
    content: str = ""


class OmiFlowMetadata(BaseModel):
    oa_id: str | None = None
    department: str | None = None


class OmiFlowWebhook(BaseModel):
    event: str = "message"
    channel: str = "zalo_oa"
    sender_id: str
    sender_name: str | None = None
    message: OmiFlowMessage
    conversation_id: str | None = None
    timestamp: str | None = None
    metadata: OmiFlowMetadata | None = None


def verify_omiflow_signature(request: Request, body: bytes) -> bool:
    """Verify webhook signature from OmiFlow."""
    if not settings.OMIFLOW_WEBHOOK_SECRET:
        return True  # Skip verification in development

    signature = request.headers.get("X-OmiFlow-Signature", "")
    expected = hmac.new(
        settings.OMIFLOW_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


@router.post("/omiflow")
async def omiflow_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Receive message from OmiFlow (Zalo OA, Facebook, Web widget...)."""
    body = await request.body()

    if not verify_omiflow_signature(request, body):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = OmiFlowWebhook.model_validate_json(body)

    if payload.event != "message" or payload.message.type != "text":
        return {"status": "ok", "reply": None}

    start_time = time.perf_counter()
    query_text = payload.message.content.strip()

    if not query_text:
        return {"status": "ok", "reply": None}

    # 1. Authenticate - lookup user
    user = await get_user_by_zalo_id(db, payload.sender_id)
    if not user:
        return {
            "status": "ok",
            "reply": {
                "type": "text",
                "content": "Bạn chưa được đăng ký trong hệ thống. "
                "Vui lòng liên hệ admin để được cấp quyền truy cập.",
            },
        }

    # Rate limiting
    await check_rate_limit(str(user.id))

    # 2. Check for special commands
    command, remaining = detect_command(query_text)
    if command == "reset":
        await session_manager.clear_session(payload.channel, payload.sender_id)
        return {
            "status": "ok",
            "reply": {"type": "text", "content": "Đã bắt đầu cuộc trò chuyện mới."},
        }
    if command == "help":
        return {"status": "ok", "reply": {"type": "text", "content": HELP_TEXT}}

    # 3. Session management
    session = await session_manager.get_session(payload.channel, payload.sender_id)
    dify_conversation_id = session["dify_conversation_id"] if session else None

    # 4. Normalize query
    normalized_query = vietnamese_normalizer.normalize(query_text)

    # 5. Route to KB
    departments = await query_router.route(normalized_query, user)
    primary_dept = departments[0]

    # 6. Call Dify RAG
    try:
        dify_response = await dify_client.chat(
            query=normalized_query,
            department=primary_dept,
            conversation_id=dify_conversation_id,
            user_id=str(user.id),
        )
    except Exception as e:
        logger.error(f"Dify error: {e}")
        return {
            "status": "ok",
            "reply": {
                "type": "text",
                "content": "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
            },
        }

    # 7. Update session
    if dify_response.get("conversation_id"):
        await session_manager.create_or_update_session(
            channel=payload.channel,
            sender_id=payload.sender_id,
            dify_conversation_id=dify_response["conversation_id"],
            department=primary_dept,
            user_id=str(user.id),
        )

    # 8. Format response
    answer = response_formatter.format(
        answer=dify_response["answer"],
        sources=dify_response["sources"],
        channel=payload.channel,
    )

    # 9. Log query
    processing_time_ms = int((time.perf_counter() - start_time) * 1000)
    log = QueryLog(
        user_id=user.id,
        channel=payload.channel,
        query_text=query_text,
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

    return {
        "status": "ok",
        "reply": {
            "type": "text",
            "content": answer,
            "metadata": {
                "sources": [s["document"] for s in dify_response["sources"][:3]],
                "confidence": dify_response["sources"][0]["score"]
                if dify_response["sources"]
                else None,
            },
        },
    }
