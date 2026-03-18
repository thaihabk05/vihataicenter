import time

import redis.asyncio as redis
from fastapi import HTTPException, Request

from config import settings

_redis: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def check_rate_limit(user_id: str, request: Request | None = None):
    """Check rate limit for a user. Raises HTTPException if exceeded."""
    r = await get_redis()

    # Per-minute check
    minute_key = f"ratelimit:minute:{user_id}"
    minute_count = await r.incr(minute_key)
    if minute_count == 1:
        await r.expire(minute_key, 60)

    if minute_count > settings.RATE_LIMIT_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {settings.RATE_LIMIT_PER_MINUTE} requests per minute.",
        )

    # Per-day check
    day_key = f"ratelimit:day:{user_id}"
    day_count = await r.incr(day_key)
    if day_count == 1:
        await r.expire(day_key, 86400)

    if day_count > settings.RATE_LIMIT_PER_DAY:
        raise HTTPException(
            status_code=429,
            detail=f"Daily rate limit exceeded. Max {settings.RATE_LIMIT_PER_DAY} requests per day.",
        )
