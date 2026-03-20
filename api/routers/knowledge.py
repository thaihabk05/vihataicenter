from __future__ import annotations

import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.database import get_db
from models.knowledge import KnowledgeDocument
from services.dify_client import dify_client
from services.document_processor import document_processor
from utils.file_parser import validate_file_type, get_upload_path

router = APIRouter()

# Mapping knowledge_base name → Dify dataset ID
DATASET_ID_MAP = {
    "sales": settings.DIFY_DATASET_ID_SALES,
    "hr": settings.DIFY_DATASET_ID_HR,
    "accounting": settings.DIFY_DATASET_ID_ACCOUNTING,
    "general": settings.DIFY_DATASET_ID_GENERAL,
    "management": settings.DIFY_DATASET_ID_MANAGEMENT,
}


class KnowledgeDocResponse(BaseModel):
    id: str
    knowledge_base: str
    title: str
    file_name: str | None
    file_type: str | None
    file_size_bytes: int | None
    tags: list[str]
    chunks_count: int | None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/upload")
async def upload_knowledge(
    file: UploadFile = File(...),
    knowledge_base: str = Form(...),
    title: str = Form(...),
    tags: str = Form(""),
    auto_chunk: bool = Form(True),
    chunk_size: int = Form(800),
    chunk_overlap: int = Form(100),
    db: AsyncSession = Depends(get_db),
):
    """Upload document to Knowledge Base."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    if not validate_file_type(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Allowed: pdf, docx, xlsx, txt, md",
        )

    # Save file locally
    file_ext = os.path.splitext(file.filename)[1]
    stored_name = f"{uuid.uuid4()}{file_ext}"
    file_path = get_upload_path(stored_name)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    content = await file.read()
    file_size = len(content)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max {settings.MAX_UPLOAD_SIZE_MB}MB",
        )

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    doc = KnowledgeDocument(
        knowledge_base=knowledge_base,
        title=title,
        file_name=file.filename,
        file_type=file_ext.lstrip("."),
        file_size_bytes=file_size,
        tags=tag_list,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Process and upload to Dify (async in background would be better, but keeping simple for Phase 1)
    try:
        # Pre-process document
        processed_text = await document_processor.process(file_path)

        # Save processed text as markdown for Dify
        md_path = file_path + ".md"
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"# {title}\n\n{processed_text}")

        # Upload to Dify
        chunk_config = {
            "indexing_technique": "high_quality",
            "process_rule": {
                "mode": "automatic" if auto_chunk else "custom",
            },
        }

        if not auto_chunk:
            chunk_config["process_rule"] = {
                "mode": "custom",
                "rules": {
                    "pre_processing_rules": [
                        {"id": "remove_extra_spaces", "enabled": True},
                        {"id": "remove_urls_emails", "enabled": False},
                    ],
                    "segmentation": {
                        "separator": "###",
                        "max_tokens": chunk_size,
                        "chunk_overlap": chunk_overlap,
                    },
                },
            }

        dataset_id = DATASET_ID_MAP.get(knowledge_base)
        if dataset_id:
            dify_result = await dify_client.upload_document(
                md_path, dataset_id, chunk_config
            )
            doc.dify_document_id = (
                dify_result.get("document", {}).get("id")
            )
            doc.chunks_count = (
                dify_result.get("document", {}).get("segments_count")
            )

        doc.status = "ready"
        await db.commit()

    except Exception as e:
        doc.status = "error"
        doc.error_message = str(e)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

    return {
        "status": "success",
        "document_id": str(doc.id),
        "chunks_created": doc.chunks_count,
        "processing_time_ms": None,
    }


@router.get("/list", response_model=list[KnowledgeDocResponse])
async def list_knowledge(
    knowledge_base: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List documents in Knowledge Base."""
    stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.created_at.desc())

    if knowledge_base:
        stmt = stmt.where(KnowledgeDocument.knowledge_base == knowledge_base)
    if status:
        stmt = stmt.where(KnowledgeDocument.status == status)

    result = await db.execute(stmt)
    docs = result.scalars().all()
    return [
        KnowledgeDocResponse(
            id=str(d.id),
            knowledge_base=d.knowledge_base,
            title=d.title,
            file_name=d.file_name,
            file_type=d.file_type,
            file_size_bytes=d.file_size_bytes,
            tags=d.tags or [],
            chunks_count=d.chunks_count,
            status=d.status,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.delete("/{doc_id}")
async def delete_knowledge(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a document."""
    result = await db.execute(
        select(KnowledgeDocument).where(KnowledgeDocument.id == uuid.UUID(doc_id))
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # TODO: Also delete from Dify via API
    doc.status = "deleted"
    doc.updated_at = datetime.utcnow()
    await db.commit()

    return {"status": "ok", "message": f"Document '{doc.title}' marked as deleted"}
