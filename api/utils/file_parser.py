import os
from pathlib import Path

from config import settings


def get_upload_path(filename: str) -> str:
    """Get full upload path for a file."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    return os.path.join(settings.UPLOAD_DIR, filename)


def validate_file_type(filename: str) -> bool:
    """Validate that file type is supported."""
    allowed_extensions = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".txt", ".md"}
    ext = Path(filename).suffix.lower()
    return ext in allowed_extensions


def get_file_size_mb(file_path: str) -> float:
    """Get file size in MB."""
    return os.path.getsize(file_path) / (1024 * 1024)
