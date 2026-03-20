from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.query_log import QueryLog
from services.auth_service import get_user_by_telegram_id
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


class TelegramUser(BaseModel):
    id: int
    first_name: str | None = None
    username: str | None = None


class TelegramChat(BaseModel):
    id: int
    type: str = "private"


class TelegramMessage(BaseModel):
    message_id: int
    from_: TelegramUser | None = None
    chat: TelegramChat
    text: str | None = None

    class Config:
        populate_by_name = True

    def model_post_init(self, __context):
        pass


class TelegramUpdate(BaseModel):
    update_id: int
    message: TelegramMessage | None = None


@router.post("/telegram")
async def telegram_webhook(
    update: TelegramUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Receive message from Telegram Bot."""
    if not update.message or not update.message.text:
        return {"status": "ok"}

    start_time = time.perf_counter()
    chat_id = update.message.chat.id
    telegram_user_id = update.message.from_.id if update.message.from_ else chat_id
    query_text = update.message.text.strip()

    # Strip /ask prefix if present
    if query_text.startswith("/ask "):
        query_text = query_text[5:].strip()
    elif query_text == "/start":
        await notification_service.send_telegram(
            chat_id,
            "Xin chào! Tôi là trợ lý kiến thức ViHAT.\n"
            "Sử dụng /ask [câu hỏi] để hỏi.\n"
            "Gõ /help để xem hướng dẫn.",
        )
        return {"status": "ok"}

    if not query_text:
        return {"status": "ok"}

    # 1. Authenticate
    user = await get_user_by_telegram_id(db, telegram_user_id)
    if not user:
        await notification_service.send_telegram(
            chat_id,
            "Bạn chưa được đăng ký trong hệ thống. "
            "Vui lòng liên hệ admin để được cấp quyền truy cập.",
        )
        return {"status": "ok"}

    await check_rate_limit(str(user.id))

    # 2. Commands
    command, remaining = detect_command(query_text)
    if command == "reset":
        await session_manager.clear_session("telegram", str(telegram_user_id))
        await notification_service.send_telegram(
            chat_id, "Đã bắt đầu cuộc trò chuyện mới."
        )
        return {"status": "ok"}
    if command == "help":
        await notification_service.send_telegram(chat_id, HELP_TEXT)
        return {"status": "ok"}

    # 3. Session
    session = await session_manager.get_session("telegram", str(telegram_user_id))
    dify_conversation_id = session["dify_conversation_id"] if session else None

    # 4. Normalize
    normalized_query = vietnamese_normalizer.normalize(query_text)

    # 5. Route
    departments = await query_router.route(normalized_query, user)
    primary_dept = departments[0]

    # 6. Call Dify
    try:
        dify_response = await dify_client.chat(
            query=normalized_query,
            department=primary_dept,
            conversation_id=dify_conversation_id,
            user_id=str(user.id),
        )
    except Exception as e:
        logger.error(f"Dify error: {e}")
        await notification_service.send_telegram(
            chat_id, "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
        )
        return {"status": "ok"}

    # 7. Update session
    if dify_response.get("conversation_id"):
        await session_manager.create_or_update_session(
            channel="telegram",
            sender_id=str(telegram_user_id),
            dify_conversation_id=dify_response["conversation_id"],
            department=primary_dept,
            user_id=str(user.id),
        )

    # 8. Format & send
    answer = response_formatter.format(
        answer=dify_response["answer"],
        sources=dify_response["sources"],
        channel="telegram",
    )
    await notification_service.send_telegram(chat_id, answer)

    # 9. Log
    processing_time_ms = int((time.perf_counter() - start_time) * 1000)
    log = QueryLog(
        user_id=user.id,
        channel="telegram",
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

    return {"status": "ok"}
