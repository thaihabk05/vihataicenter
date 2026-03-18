import json
from datetime import timedelta

import redis.asyncio as redis

from config import settings


class SessionManager:
    """Manage conversation sessions between user and Dify.
    Mapping: channel_user_id -> dify_conversation_id
    """

    SESSION_TTL = timedelta(hours=24)

    def __init__(self):
        self._redis: redis.Redis | None = None

    async def _get_redis(self) -> redis.Redis:
        if self._redis is None:
            self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    def _key(self, channel: str, sender_id: str) -> str:
        return f"session:{channel}:{sender_id}"

    async def get_session(self, channel: str, sender_id: str) -> dict | None:
        """Get existing session."""
        r = await self._get_redis()
        data = await r.get(self._key(channel, sender_id))
        if data:
            return json.loads(data)
        return None

    async def create_or_update_session(
        self,
        channel: str,
        sender_id: str,
        dify_conversation_id: str,
        department: str,
        user_id: str,
    ) -> dict:
        """Create or update session."""
        session = {
            "dify_conversation_id": dify_conversation_id,
            "department": department,
            "user_id": user_id,
            "channel": channel,
            "sender_id": sender_id,
        }
        r = await self._get_redis()
        await r.set(
            self._key(channel, sender_id),
            json.dumps(session),
            ex=int(self.SESSION_TTL.total_seconds()),
        )
        return session

    async def clear_session(self, channel: str, sender_id: str):
        """Clear session (user types /reset)."""
        r = await self._get_redis()
        await r.delete(self._key(channel, sender_id))

    async def close(self):
        if self._redis:
            await self._redis.close()


session_manager = SessionManager()
