import httpx

from config import settings


class NotificationService:
    """Send notifications and replies back to channels."""

    async def reply_omiflow(self, conversation_id: str, content: str) -> bool:
        """Send reply back through OmiFlow API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{settings.OMIFLOW_API_URL}/messages/send",
                    headers={
                        "Authorization": f"Bearer {settings.OMIFLOW_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "conversation_id": conversation_id,
                        "message": {
                            "type": "text",
                            "content": content,
                        },
                    },
                )
                return response.status_code == 200
        except httpx.HTTPError:
            return False

    async def send_telegram(self, chat_id: int, text: str, parse_mode: str = "Markdown") -> bool:
        """Send message via Telegram Bot API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": parse_mode,
                    },
                )
                return response.status_code == 200
        except httpx.HTTPError:
            return False


notification_service = NotificationService()
