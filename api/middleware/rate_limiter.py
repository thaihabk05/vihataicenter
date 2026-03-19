import logging
import time

from fastapi import HTTPException, Request

from config import settings

logger = logging.getLogger(__name__)

_redis = None
_redis_available = None


async def get_redis():
    global _redis, _redis_available
    if _redis_available is False:
        return None
    if _redis is None and settings.REDIS_URL:
        try:
            import redis.asyncio as redis_lib
            _redis = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
            await _redis.ping()
            _redis_available = True
        except Exception as e:
            logger.warning(f"Redis not available, rate limiting disabled: {e}")
            _redis_available = False
            _redis = None
            return None
    return _redis


async def check_rate_limit(user_id: str, request: Request | None = None):
    """Check rate limit for a user. Skips if Redis not available."""
    r = await get_redis()
    if r is None:
        return  # No Redis = no rate limiting

    try:
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
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Rate limit check failed: {e}")
