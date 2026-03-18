"""Initial schema - users, query_logs, knowledge_documents, feedback

Revision ID: 001_initial
Revises:
Create Date: 2026-03-18 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=True),
        sa.Column("department", sa.String(50), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="member"),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("zalo_id", sa.String(100), nullable=True),
        sa.Column("telegram_id", sa.BigInteger, nullable=True),
        sa.Column("knowledge_access", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_users_zalo", "users", ["zalo_id"])
    op.create_index("idx_users_telegram", "users", ["telegram_id"])
    op.create_index("idx_users_department", "users", ["department"])

    # Query logs table
    op.create_table(
        "query_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("query_text", sa.Text, nullable=False),
        sa.Column("answer_text", sa.Text, nullable=True),
        sa.Column("department_routed", sa.String(50), nullable=True),
        sa.Column("sources", postgresql.JSONB, nullable=True),
        sa.Column("confidence_score", sa.Float, nullable=True),
        sa.Column("tokens_prompt", sa.Integer, nullable=True),
        sa.Column("tokens_completion", sa.Integer, nullable=True),
        sa.Column("processing_time_ms", sa.Integer, nullable=True),
        sa.Column("feedback_rating", sa.Integer, nullable=True),
        sa.Column("feedback_text", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_logs_user", "query_logs", ["user_id"])
    op.create_index("idx_logs_created", "query_logs", ["created_at"])
    op.create_index("idx_logs_department", "query_logs", ["department_routed"])

    # Knowledge documents table
    op.create_table(
        "knowledge_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("dify_document_id", sa.String(100), nullable=True),
        sa.Column("knowledge_base", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=True),
        sa.Column("file_type", sa.String(20), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger, nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.Text), server_default="{}"),
        sa.Column("chunks_count", sa.Integer, nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(20), server_default="processing"),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_docs_kb", "knowledge_documents", ["knowledge_base"])
    op.create_index("idx_docs_status", "knowledge_documents", ["status"])

    # Feedback table
    op.create_table(
        "feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("query_log_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("query_logs.id"), nullable=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("rating", sa.Integer, nullable=True),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.text("NOW()")),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="check_rating_range"),
    )


def downgrade() -> None:
    op.drop_table("feedback")
    op.drop_table("knowledge_documents")
    op.drop_table("query_logs")
    op.drop_table("users")
