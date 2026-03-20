# Lazy imports — gracefully degrade if heavy deps (sqlalchemy etc.) are missing.
# This allows lightweight consumers (e.g. dev_mock_server) to import individual
# service modules (google_drive_sync, google_sheets_sync) without pulling in
# the full production dependency chain.

try:
    from services.dify_client import dify_client
    from services.session_manager import session_manager
    from services.query_router import query_router
    from services.response_formatter import response_formatter
    from services.document_processor import document_processor
    from services.notification import notification_service

    __all__ = [
        "dify_client",
        "session_manager",
        "query_router",
        "response_formatter",
        "document_processor",
        "notification_service",
    ]
except ImportError:
    __all__ = []
