import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("vihat.api")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.perf_counter()

        response = await call_next(request)

        process_time_ms = int((time.perf_counter() - start_time) * 1000)

        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"time={process_time_ms}ms"
        )

        response.headers["X-Process-Time-Ms"] = str(process_time_ms)
        return response
