import json
import logging
from datetime import timedelta

from config import settings

logger = logging.getLogger(__name__)


class SessionManager:
    """Manage conversation sessions between user and Dify.
    Falls back to in-memory dict if Redis not available.
    """

    SESSION_TTL = timedelta(hours=24)

    def __init__(self):
        self._redis = None
        self._redis_available = None
        self._memory_store: dict[str, str] = {}  # Fallback

    async def _get_redis(self):
        if self._redis_available is False:
            return None
        if self._redis is None and settings.REDIS_URL:
            try:
                import redis.asyncio as redis_lib
                self._redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
                await self._redis.ping()
                self._redis_available = True
            except Exception as e:
                logger.warning(f"Redis not available, using in-memory sessions: {e}")
                self._redis_available = False
                self._redis = None
                return None
        return self._redis

    def _key(self, channel: str, sender_id: str) -> str:
        return f"session:{channel}:{sender_id}"

    async def get_session(self, channel: str, sender_id: str) -> dict | None:
        key = self._key(channel, sender_id)
        r = await self._get_redis()
        if r:
            data = await r.get(key)
            if data:
                return json.loads(data)
            return None
        # Fallback: in-memory
        data = self._memory_store.get(key)
        return json.loads(data) if data else None

    async def create_or_update_session(
        self,
        channel: str,
        sender_id: str,
        dify_conversation_id: str,
        department: str,
        user_id: str,
    ) -> dict:
        session = {
            "dify_conversation_id": dify_conversation_id,
            "department": department,
            "user_id": user_id,
            "channel": channel,
            "sender_id": sender_id,
        }
        key = self._key(channel, sender_id)
        r = await self._get_redis()
        if r:
            await r.set(key, json.dumps(session), ex=int(self.SESSION_TTL.total_seconds()))
        else:
            self._memory_store[key] = json.dumps(session)
        return session

    async def clear_session(self, channel: str, sender_id: str):
        key = self._key(channel, sender_id)
        r = await self._get_redis()
        if r:
            await r.delete(key)
        else:
            self._memory_store.pop(key, None)

    async def close(self):
        if self._redis:
            await self._redis.close()


session_manager = SessionManager()
