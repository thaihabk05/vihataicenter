import time
from functools import wraps


def timer(func):
    """Decorator to measure function execution time in milliseconds."""

    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = await func(*args, **kwargs)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        if isinstance(result, dict):
            result["processing_time_ms"] = elapsed_ms
        return result

    return wrapper


SPECIAL_COMMANDS = {
    "/reset": "reset",
    "bắt đầu lại": "reset",
    "/help": "help",
    "trợ giúp": "help",
    "/feedback": "feedback",
    "/switch": "switch",
    "/sources": "sources",
}


def detect_command(text: str) -> tuple[str | None, str]:
    """Detect special commands in user message.

    Returns:
        tuple of (command_name, remaining_text)
    """
    text_lower = text.strip().lower()

    for trigger, command in SPECIAL_COMMANDS.items():
        if text_lower.startswith(trigger):
            remaining = text[len(trigger) :].strip()
            return command, remaining

    return None, text


HELP_TEXT = """Xin chào! Tôi là trợ lý kiến thức ViHAT. Các lệnh hỗ trợ:

/reset - Bắt đầu cuộc trò chuyện mới
/help - Hiển thị trợ giúp
/feedback [nội dung] - Gửi phản hồi
/sources - Xem nguồn tham khảo của câu trả lời trước
/switch [phòng ban] - Chuyển Knowledge Base (nếu có quyền)

Bạn có thể hỏi tôi bất kỳ câu hỏi nào liên quan đến kiến thức nội bộ ViHAT Group."""
