import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, BigInteger, ARRAY, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from models.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    department: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="member")

    # Password (for web login)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Channel identifiers
    zalo_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)

    # Access control
    knowledge_access: Mapped[list[str]] = mapped_column(
        ARRAY(Text), default=list, server_default="{}"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
