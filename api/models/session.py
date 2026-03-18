from pydantic import BaseModel


class SessionData(BaseModel):
    """Session data stored in Redis"""

    dify_conversation_id: str
    department: str
    user_id: str
    channel: str
    sender_id: str
