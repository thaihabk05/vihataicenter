"""AI-powered query rewriting for better RAG retrieval.

Uses Claude API to expand short/ambiguous Vietnamese queries into
comprehensive search queries that cover all relevant aspects.
"""

import logging
import httpx
from config import settings

logger = logging.getLogger(__name__)

REWRITE_PROMPT = """Bạn là module rewrite query tiếng Việt cho hệ thống RAG nội bộ ViHAT Group.

Nhiệm vụ: Nhận câu hỏi gốc và rewrite thành câu hỏi tối ưu cho vector search.

Quy tắc:
1. Giữ nguyên ý nghĩa gốc
2. Mở rộng viết tắt: "omi" → "OmiCall", "zns" → "Zalo ZNS"
3. Nếu câu hỏi về 1 chủ đề chung → liệt kê CÁC KHÍA CẠNH cần tìm
   Ví dụ: "thâm niên" → "chính sách mừng thâm niên, quà tặng thâm niên, thưởng ngày phép theo thâm niên"
   Ví dụ: "ốm đau" → "chính sách ốm đau, thăm hỏi ốm đau tai nạn, mức hưởng ốm đau, điều kiện áp dụng"
4. Thêm context nếu câu hỏi quá ngắn/mơ hồ
5. Output CHỈ là câu hỏi đã rewrite, không giải thích

Câu hỏi gốc: {query}
Câu hỏi rewrite:"""


async def rewrite_query(query: str) -> str:
    """Rewrite query using Claude API for better RAG retrieval."""
    if not settings.ANTHROPIC_API_KEY:
        return query

    # Skip rewrite for very specific queries or commands
    if len(query) > 100 or query.startswith("/"):
        return query

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-20250414",
                    "max_tokens": 200,
                    "messages": [
                        {"role": "user", "content": REWRITE_PROMPT.format(query=query)}
                    ],
                },
            )
            if response.status_code == 200:
                data = response.json()
                rewritten = data["content"][0]["text"].strip().strip('"')
                if rewritten and len(rewritten) > 5:
                    logger.info(f"Query rewrite: '{query}' → '{rewritten}'")
                    return rewritten
    except Exception as e:
        logger.warning(f"Query rewrite failed, using original: {e}")

    return query
