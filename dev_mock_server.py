"""
Mock API Server for Admin Panel development.
No PostgreSQL/Redis/Dify required - pure in-memory mock data.

Usage:
  pip install fastapi uvicorn python-jose passlib[bcrypt]
  python dev_mock_server.py

Then open: http://localhost:3000 (Admin Panel)
API runs at: http://localhost:8000
"""

from __future__ import annotations

import os
import uuid
import random
import httpx
import json
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load .env
from pathlib import Path
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.split("#")[0].strip()  # remove inline comments
            if key and val:
                os.environ.setdefault(key, val)

DIFY_BASE_URL = os.environ.get("DIFY_BASE_URL", "http://103.29.27.91/v1")
DIFY_API_KEY = os.environ.get("DIFY_API_KEY_GENERAL", "")
DIFY_DATASET_API_KEY = os.environ.get("DIFY_DATASET_API_KEY", "")
DIFY_DATASET_IDS = {
    "sales": os.environ.get("DIFY_DATASET_ID_SALES", ""),
    "hr": os.environ.get("DIFY_DATASET_ID_HR", ""),
    "accounting": os.environ.get("DIFY_DATASET_ID_ACCOUNTING", ""),
    "general": os.environ.get("DIFY_DATASET_ID_GENERAL", ""),
    "management": os.environ.get("DIFY_DATASET_ID_MANAGEMENT", ""),
}

# ---- Fake Auth ----
SECRET_KEY = "dev-secret-key"
ALGORITHM = "HS256"

try:
    from jose import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False
    print("WARNING: python-jose not installed. Auth will use simple token.")

# Simple password verification (no bcrypt dependency needed for dev)
import hashlib

def simple_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def simple_verify(password: str, hashed: str) -> bool:
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def create_token(user_id: str, role: str) -> str:
    if HAS_JWT:
        return jwt.encode(
            {"sub": user_id, "role": role, "exp": datetime.utcnow() + timedelta(hours=24)},
            SECRET_KEY, algorithm=ALGORITHM
        )
    return f"mock-token-{user_id}"


def verify_token(token: str):
    if HAS_JWT:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception:
            return None
    if token.startswith("mock-token-"):
        user_id = token.replace("mock-token-", "")
        return {"sub": user_id, "role": "super_admin"}
    return None


# ---- Mock Data ----
ADMIN_ID = str(uuid.uuid4())

MOCK_USERS = [
    {
        "id": ADMIN_ID,
        "name": "Đinh Thái Hà",
        "email": "admin@vihat.vn",
        "department": "management",
        "role": "super_admin",
        "password_hash": simple_hash("vihat@2026"),
        "zalo_id": "zalo_admin_001",
        "telegram_id": 123456789,
        "knowledge_access": ["sales", "hr", "accounting", "general", "management"],
        "is_active": True,
        "created_at": "2026-03-01T09:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Nguyễn Văn Bình",
        "email": "binh.nguyen@vihat.vn",
        "department": "sales",
        "role": "lead",
        "password_hash": simple_hash("password123"),
        "zalo_id": "zalo_sales_001",
        "telegram_id": None,
        "knowledge_access": ["sales", "general"],
        "is_active": True,
        "created_at": "2026-03-05T10:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Trần Thị Cúc",
        "email": "cuc.tran@vihat.vn",
        "department": "hr",
        "role": "admin",
        "password_hash": simple_hash("password123"),
        "zalo_id": None,
        "telegram_id": 987654321,
        "knowledge_access": ["hr", "general"],
        "is_active": True,
        "created_at": "2026-03-03T08:30:00",
    },
    {
        "id": str(uuid.uuid4()),
        "name": "Lê Minh Đức",
        "email": "duc.le@vihat.vn",
        "department": "accounting",
        "role": "member",
        "password_hash": simple_hash("password123"),
        "zalo_id": "zalo_acct_001",
        "telegram_id": None,
        "knowledge_access": ["accounting", "general"],
        "is_active": True,
        "created_at": "2026-03-10T14:00:00",
    },
]

SAMPLE_QUERIES = [
    ("Cho tôi bảng giá OmiCall Enterprise", "sales", "zalo_oa"),
    ("Quy trình xin nghỉ phép dài ngày", "hr", "telegram"),
    ("Cách xuất hóa đơn GTGT cho khách hàng nước ngoài", "accounting", "web_admin"),
    ("So sánh OmiCall với Stringee", "sales", "zalo_oa"),
    ("Chính sách bảo hiểm xã hội cho nhân viên thử việc", "hr", "telegram"),
    ("Quy trình thanh toán công nợ", "accounting", "zalo_oa"),
    ("Hướng dẫn dùng SMS Brandname", "sales", "telegram"),
    ("Thời gian nghỉ lễ 30/4 và 1/5", "general", "zalo_oa"),
    ("Giá gói Zalo ZNS Premium", "sales", "web_admin"),
    ("Quy trình onboarding nhân viên mới", "hr", "zalo_oa"),
]

SAMPLE_ANSWERS = [
    "Gói OmiCall Enterprise có giá từ 5.000.000đ/tháng, hỗ trợ tối đa 50 agents, tích hợp CRM, recording không giới hạn.",
    "Quy trình nghỉ phép dài ngày (>3 ngày): 1) Gửi đơn qua HRM trước 7 ngày. 2) Trưởng phòng phê duyệt. 3) HR xác nhận.",
    "Để xuất hóa đơn GTGT cho KH nước ngoài: Vào hệ thống EInvoice → Chọn 'Hóa đơn xuất khẩu' → Điền thông tin theo mẫu.",
    "So sánh OmiCall vs Stringee: OmiCall hỗ trợ AI routing, giá cạnh tranh hơn 20%, tích hợp sẵn với eSMS và Zalo OA.",
    "NV thử việc được đóng BHXH sau khi ký HĐLĐ chính thức. Trong thời gian thử việc, công ty đóng BHYT bắt buộc.",
]


def generate_mock_logs(count: int = 50) -> list:
    logs = []
    for i in range(count):
        q_idx = i % len(SAMPLE_QUERIES)
        query, dept, channel = SAMPLE_QUERIES[q_idx]
        a_idx = i % len(SAMPLE_ANSWERS)
        user = random.choice(MOCK_USERS)
        created = datetime.utcnow() - timedelta(hours=random.randint(1, 720))

        logs.append({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_name": user["name"],
            "channel": channel,
            "query_text": query,
            "answer_text": SAMPLE_ANSWERS[a_idx],
            "department_routed": dept,
            "sources": [
                {"document": f"doc_{dept}_{random.randint(1,10)}.pdf", "chunk": "...", "score": round(random.uniform(0.7, 0.98), 2)},
            ],
            "confidence_score": round(random.uniform(0.65, 0.98), 2),
            "tokens_prompt": random.randint(800, 2000),
            "tokens_completion": random.randint(200, 600),
            "processing_time_ms": random.randint(1200, 4500),
            "feedback_rating": random.choice([None, None, None, 4, 5]),
            "created_at": created.isoformat(),
        })
    logs.sort(key=lambda x: x["created_at"], reverse=True)
    return logs


MOCK_LOGS = generate_mock_logs(50)

MOCK_DOCUMENTS = [
    {
        "id": str(uuid.uuid4()),
        "knowledge_base": "sales",
        "title": "Bảng giá OmiCall Q1 2026",
        "file_name": "pricing_omicall_q1_2026.xlsx",
        "file_type": "xlsx",
        "file_size_bytes": 245760,
        "tags": ["omicall", "pricing"],
        "chunks_count": 24,
        "status": "ready",
        "created_at": "2026-03-01T10:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "knowledge_base": "sales",
        "title": "Catalog sản phẩm eSMS 2026",
        "file_name": "esms_catalog_2026.pdf",
        "file_type": "pdf",
        "file_size_bytes": 1548000,
        "tags": ["esms", "catalog"],
        "chunks_count": 42,
        "status": "ready",
        "created_at": "2026-03-02T11:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "knowledge_base": "hr",
        "title": "Nội quy lao động ViHAT Group 2026",
        "file_name": "noi_quy_lao_dong_2026.docx",
        "file_type": "docx",
        "file_size_bytes": 385024,
        "tags": ["noi-quy", "lao-dong"],
        "chunks_count": 18,
        "status": "ready",
        "created_at": "2026-03-03T09:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "knowledge_base": "accounting",
        "title": "Quy trình xuất hóa đơn GTGT",
        "file_name": "quy_trinh_hoa_don.pdf",
        "file_type": "pdf",
        "file_size_bytes": 520000,
        "tags": ["hoa-don", "thue"],
        "chunks_count": 15,
        "status": "ready",
        "created_at": "2026-03-05T14:00:00",
    },
    {
        "id": str(uuid.uuid4()),
        "knowledge_base": "general",
        "title": "SOP liên phòng ban - Phối hợp Sales-Kế toán",
        "file_name": "sop_lien_phong_ban.pdf",
        "file_type": "pdf",
        "file_size_bytes": 290000,
        "tags": ["sop", "lien-phong-ban"],
        "chunks_count": 10,
        "status": "ready",
        "created_at": "2026-03-07T16:00:00",
    },
]

# ---- App ----

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("\n" + "=" * 60)
    print("  ViHAT Knowledge System — Mock Dev Server")
    print("=" * 60)
    print(f"  API:   http://localhost:8000")
    print(f"  Docs:  http://localhost:8000/docs")
    print(f"  Login: admin@vihat.vn / vihat@2026")
    print("=" * 60 + "\n")
    yield


app = FastAPI(
    title="ViHAT Knowledge System (Mock Dev)",
    version="dev",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = auth.split(" ", 1)[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Invalid token")
    user_id = payload["sub"]
    for u in MOCK_USERS:
        if u["id"] == user_id:
            return u
    raise HTTPException(401, "User not found")


# --- Auth ---

class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/v1/auth/login")
async def login(req: LoginRequest):
    for user in MOCK_USERS:
        if user["email"] == req.email:
            if simple_verify(req.password, user["password_hash"]):
                token = create_token(user["id"], user["role"])
                return {
                    "access_token": token,
                    "token_type": "bearer",
                    "user": {k: v for k, v in user.items() if k != "password_hash"},
                }
    raise HTTPException(401, "Email hoặc mật khẩu không đúng")


@app.get("/api/v1/auth/me")
async def get_me(request: Request):
    user = get_current_user(request)
    return {k: v for k, v in user.items() if k != "password_hash"}


# --- Stats ---

@app.get("/api/v1/admin/stats")
async def get_stats(days: int = 30, request: Request = None):
    return {
        "period": f"{(datetime.utcnow() - timedelta(days=days)).date()} to {datetime.utcnow().date()}",
        "total_queries": 3542,
        "by_department": {"sales": 1890, "hr": 620, "accounting": 480, "general": 552},
        "by_channel": {"zalo_oa": 2100, "telegram": 1200, "web_admin": 242},
        "avg_response_time_ms": 2150,
        "avg_confidence_score": 0.87,
        "tokens_used": {"total": 2450000, "prompt": 1680000, "completion": 770000},
    }


# --- Users ---

@app.get("/api/v1/admin/users")
async def list_users(department: Optional[str] = None):
    users = MOCK_USERS
    if department:
        users = [u for u in users if u["department"] == department]
    return [{k: v for k, v in u.items() if k != "password_hash"} for u in users]


class UserCreate(BaseModel):
    name: str
    email: Optional[str] = None
    department: str
    role: str = "member"
    zalo_id: Optional[str] = None
    telegram_id: Optional[int] = None
    knowledge_access: List[str] = []


@app.post("/api/v1/admin/users")
async def create_user(data: UserCreate):
    new_user = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email,
        "department": data.department,
        "role": data.role,
        "zalo_id": data.zalo_id,
        "telegram_id": data.telegram_id,
        "knowledge_access": data.knowledge_access,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }
    MOCK_USERS.append(new_user)
    return new_user


@app.put("/api/v1/admin/users/{user_id}")
async def update_user(user_id: str, data: dict):
    for u in MOCK_USERS:
        if u["id"] == user_id:
            for k, v in data.items():
                if k != "id" and k != "password_hash":
                    u[k] = v
            return {k: v for k, v in u.items() if k != "password_hash"}
    raise HTTPException(404, "User not found")


@app.delete("/api/v1/admin/users/{user_id}")
async def delete_user(user_id: str):
    for u in MOCK_USERS:
        if u["id"] == user_id:
            u["is_active"] = False
            return {"status": "ok", "message": f"User {u['name']} deactivated"}
    raise HTTPException(404, "User not found")


# --- Knowledge ---

KB_NAME_MAP = {
    "sales": "ViHAT Sales Knowledge",
    "hr": "ViHAT HR Knowledge",
    "accounting": "ViHAT Accounting Knowledge",
    "general": "ViHAT General Knowledge",
    "management": "ViHAT Management Knowledge",
}
KB_NAME_REVERSE = {v: k for k, v in KB_NAME_MAP.items()}


@app.get("/api/v1/admin/knowledge/list")
async def list_knowledge(knowledge_base: Optional[str] = None, status: Optional[str] = None):
    """List parent documents (grouped). Each item = 1 original file with section count."""
    if not DIFY_DATASET_API_KEY:
        return []

    # Collect all Dify docs with their status
    all_dify_docs = {}  # doc_id → {status, name, size, ...}
    datasets_to_check = {}

    if knowledge_base:
        ds_id = DIFY_DATASET_IDS.get(knowledge_base, "")
        if ds_id:
            datasets_to_check[knowledge_base] = ds_id
    else:
        datasets_to_check = {k: v for k, v in DIFY_DATASET_IDS.items() if v}

    async with httpx.AsyncClient(timeout=30.0) as client:
        for kb_key, ds_id in datasets_to_check.items():
            try:
                resp = await client.get(
                    f"{DIFY_BASE_URL}/datasets/{ds_id}/documents",
                    headers={"Authorization": f"Bearer {DIFY_DATASET_API_KEY}"},
                    params={"page": 1, "limit": 100},
                )
                resp.raise_for_status()
                for doc in resp.json().get("data", []):
                    all_dify_docs[doc["id"]] = {
                        "kb": kb_key,
                        "status": doc.get("indexing_status", "unknown"),
                        "name": doc.get("name", ""),
                        "tokens": doc.get("tokens", 0),
                    }
            except Exception as e:
                print(f"Error fetching docs from {kb_key}: {e}")

    # Build parent document list from registry
    docs = []
    for parent_id, entry in FILE_REGISTRY.items():
        kb = entry.get("knowledge_base", "")
        if knowledge_base and kb != knowledge_base:
            continue

        section_ids = entry.get("section_doc_ids", [])

        # Determine overall status from sections
        section_statuses = [all_dify_docs.get(sid, {}).get("status", "unknown") for sid in section_ids]
        if all(s == "completed" for s in section_statuses) and section_statuses:
            overall_status = "ready"
        elif any(s in ("indexing", "splitting", "parsing", "waiting") for s in section_statuses):
            overall_status = "indexing"
        elif any(s == "error" for s in section_statuses):
            overall_status = "error"
        elif not section_statuses:
            overall_status = "processing"
        else:
            overall_status = "ready"

        file_name = entry.get("file_name", "")
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "txt"

        docs.append({
            "id": parent_id,
            "knowledge_base": kb,
            "title": entry.get("title", file_name),
            "file_name": file_name,
            "file_type": ext.upper(),
            "file_size_bytes": Path(entry.get("file_path", "")).stat().st_size if Path(entry.get("file_path", "")).exists() else 0,
            "tags": [],
            "sections_count": len(section_ids),
            "status": overall_status,
            "source_type": entry.get("source_type", "upload"),
            "drive_url": entry.get("drive_url", ""),
            "created_at": entry.get("uploaded_at", ""),
            "download_url": f"http://localhost:8000/api/v1/files/{parent_id}/download",
        })

    # Sort by created_at desc
    docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    return docs


from fastapi import UploadFile, File, Form
import tempfile


def preprocess_excel(file_content: bytes, file_name: str) -> str:
    """Convert Excel to markdown for better RAG indexing."""
    try:
        import openpyxl
        import io
        wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
        result = [f"# {file_name}\n"]
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            result.append(f"## {sheet_name}\n")
            for row in ws.iter_rows(values_only=True):
                cells = []
                for c in row:
                    s = str(c).strip() if c is not None else ""
                    if s == "None":
                        s = ""
                    cells.append(s)
                non_empty = [c for c in cells if c]
                if non_empty:
                    result.append(" | ".join(non_empty))
            result.append("")
        return "\n".join(result)
    except Exception as e:
        print(f"Excel preprocess error: {e}")
        return None


def preprocess_docx(file_content: bytes, file_name: str) -> str:
    """Convert DOCX to markdown for better RAG indexing."""
    try:
        from docx import Document as DocxDoc
        import io
        doc = DocxDoc(io.BytesIO(file_content))
        parts = [f"# {file_name}\n"]
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            style = para.style.name if para.style else ""
            if "Heading" in style:
                level = 2
                try:
                    level = int(style[-1])
                except:
                    pass
                parts.append(f"{'#' * level} {text}")
            else:
                parts.append(text)
        for i, table in enumerate(doc.tables):
            parts.append(f"\n### Bảng {i+1}\n")
            for row_idx, row in enumerate(table.rows):
                cells = [cell.text.strip().replace("\n", " | ") for cell in row.cells]
                cleaned = []
                prev = None
                for c in cells:
                    if c != prev:
                        cleaned.append(c)
                    prev = c
                if row_idx == 0:
                    parts.append("| " + " | ".join(cleaned) + " |")
                    parts.append("| " + " | ".join(["---"] * len(cleaned)) + " |")
                else:
                    parts.append("| " + " | ".join(cleaned) + " |")
            parts.append("")
        return "\n".join(parts)
    except Exception as e:
        print(f"DOCX preprocess error: {e}")
        return None


def split_into_sections(markdown_text: str, doc_title: str, max_tokens: int = 1500) -> list[dict]:
    """Split markdown into semantic sections for better RAG chunking.

    Each section keeps its heading context and stays under max_tokens.
    Returns list of {name, text} dicts ready for Dify upload.
    """
    lines = markdown_text.split("\n")
    sections = []
    current_section = []
    current_heading = doc_title

    # Detect section boundaries: Roman numerals, ##, numbered headings
    import re
    section_pattern = re.compile(
        r'^(#{1,3}\s+|[IVX]+\.\s+|\d+\.\s+[A-ZĐ]|[A-ZĐ]{2,}.*:$)',
        re.MULTILINE
    )

    for line in lines:
        is_heading = bool(section_pattern.match(line.strip()))

        if is_heading and current_section:
            # Save current section
            text = "\n".join(current_section).strip()
            if text and len(text) > 50:  # Skip tiny sections
                sections.append({
                    "name": f"{doc_title} — {current_heading}",
                    "text": f"# {doc_title}\n## {current_heading}\n\n{text}",
                })
            current_section = []
            current_heading = line.strip().lstrip("#").strip()

        current_section.append(line)

    # Don't forget last section
    if current_section:
        text = "\n".join(current_section).strip()
        if text and len(text) > 50:
            sections.append({
                "name": f"{doc_title} — {current_heading}",
                "text": f"# {doc_title}\n## {current_heading}\n\n{text}",
            })

    # Merge small sections (< 200 chars) with next one
    merged = []
    buffer = None
    for sec in sections:
        if buffer:
            if len(buffer["text"]) < 200:
                buffer["text"] += "\n\n" + sec["text"]
                buffer["name"] = sec["name"]
            else:
                merged.append(buffer)
                buffer = sec
        else:
            buffer = sec
    if buffer:
        merged.append(buffer)

    return merged if merged else [{"name": doc_title, "text": markdown_text}]


# File storage for original files (for download)
UPLOAD_DIR = Path(__file__).parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Parent document registry:
# parent_id → {file_name, title, file_path, knowledge_base, uploaded_at, section_doc_ids: [...], drive_url?, source_type}
FILE_REGISTRY: dict[str, dict] = {}

# Load existing files from disk
_registry_path = UPLOAD_DIR / "_registry.json"
if _registry_path.exists():
    try:
        FILE_REGISTRY = json.loads(_registry_path.read_text())
    except Exception:
        pass


def save_registry():
    _registry_path.write_text(json.dumps(FILE_REGISTRY, ensure_ascii=False, indent=2))


from fastapi.responses import FileResponse


@app.get("/api/v1/files/{file_id}/download")
async def download_file(file_id: str):
    """Download original file by Dify document ID or file registry ID."""
    # Try file registry first
    entry = FILE_REGISTRY.get(file_id)
    if entry:
        fpath = Path(entry["file_path"])
        if fpath.exists():
            return FileResponse(
                str(fpath),
                filename=entry["file_name"],
                media_type="application/octet-stream",
            )

    raise HTTPException(404, "File không tồn tại")


@app.get("/api/v1/files")
async def list_files():
    """List all downloadable files."""
    files = []
    for doc_id, entry in FILE_REGISTRY.items():
        files.append({
            "id": doc_id,
            "file_name": entry["file_name"],
            "knowledge_base": entry.get("knowledge_base", ""),
            "uploaded_at": entry.get("uploaded_at", ""),
            "download_url": f"/api/v1/files/{doc_id}/download",
        })
    return files


@app.post("/api/v1/admin/knowledge/upload")
async def upload_knowledge(
    file: UploadFile = File(...),
    knowledge_base: str = Form("general"),
    title: str = Form(""),
    auto_chunk: bool = Form(True),
    chunk_size: int = Form(800),
    chunk_overlap: int = Form(100),
):
    """Upload document to Dify with auto pre-processing for Excel/DOCX."""
    ds_id = DIFY_DATASET_IDS.get(knowledge_base, "")
    if not ds_id or not DIFY_DATASET_API_KEY:
        raise HTTPException(400, f"Dataset ID not configured for '{knowledge_base}'")

    file_content = await file.read()
    file_name = file.filename or title or "document"

    # Save original file for download
    stored_name = f"{uuid.uuid4()}_{file_name}"
    stored_path = UPLOAD_DIR / stored_name
    stored_path.write_bytes(file_content)
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    # Auto pre-process Excel and DOCX for better RAG quality
    preprocessed_text = None
    if ext in ("xlsx", "xls"):
        preprocessed_text = preprocess_excel(file_content, file_name)
    elif ext in ("docx", "doc"):
        preprocessed_text = preprocess_docx(file_content, file_name)

    chunk_config = {
        "indexing_technique": "high_quality",
        "process_rule": {"mode": "automatic"},
    }

    section_doc_ids = []
    result = None

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            if preprocessed_text:
                sections = split_into_sections(preprocessed_text, title or file_name)
                print(f"[Upload] Split '{title}' into {len(sections)} sections")

                for i, section in enumerate(sections):
                    resp = await client.post(
                        f"{DIFY_BASE_URL}/datasets/{ds_id}/document/create_by_text",
                        headers={
                            "Authorization": f"Bearer {DIFY_DATASET_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "name": section["name"],
                            "text": section["text"],
                            "indexing_technique": "high_quality",
                            "process_rule": {"mode": "automatic"},
                        },
                    )
                    if resp.status_code == 200:
                        sec_id = resp.json().get("document", {}).get("id")
                        if sec_id:
                            section_doc_ids.append(sec_id)
                        if result is None:
                            result = resp.json()
                    else:
                        print(f"[Upload] Section {i+1} error: {resp.status_code}")
            else:
                resp = await client.post(
                    f"{DIFY_BASE_URL}/datasets/{ds_id}/document/create_by_file",
                    headers={"Authorization": f"Bearer {DIFY_DATASET_API_KEY}"},
                    files={"file": (file_name, file_content, file.content_type or "application/octet-stream")},
                    data={"data": json.dumps(chunk_config)},
                )
                if resp.status_code == 200:
                    result = resp.json()
                    sec_id = result.get("document", {}).get("id")
                    if sec_id:
                        section_doc_ids.append(sec_id)

            if not result:
                raise HTTPException(500, "Dify upload failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Upload error: {e}")

    # Parent document ID = first section ID or UUID
    parent_id = section_doc_ids[0] if section_doc_ids else str(uuid.uuid4())

    FILE_REGISTRY[parent_id] = {
        "file_name": file_name,
        "title": title or file_name,
        "file_path": str(stored_path),
        "knowledge_base": knowledge_base,
        "source_type": "upload",
        "uploaded_at": datetime.utcnow().isoformat(),
        "section_doc_ids": section_doc_ids,
        "sections_count": len(section_doc_ids),
    }
    save_registry()

    return {
        "status": "success",
        "document_id": parent_id,
        "sections_count": len(section_doc_ids),
        "processing_time_ms": 0,
        "preprocessed": preprocessed_text is not None,
        "download_url": f"http://localhost:8000/api/v1/files/{parent_id}/download",
    }


@app.delete("/api/v1/admin/knowledge/{doc_id}")
async def delete_knowledge(doc_id: str, knowledge_base: Optional[str] = None):
    """Delete parent document and ALL its sections from Dify (cascade delete)."""
    if not DIFY_DATASET_API_KEY:
        raise HTTPException(500, "DIFY_DATASET_API_KEY not configured")

    # Find parent in registry
    parent = FILE_REGISTRY.get(doc_id)
    section_ids_to_delete = []

    if parent:
        section_ids_to_delete = parent.get("section_doc_ids", [doc_id])
        kb = parent.get("knowledge_base", knowledge_base or "")
    else:
        section_ids_to_delete = [doc_id]
        kb = knowledge_base

    # Build datasets to try
    datasets_to_try = {}
    if kb and kb in DIFY_DATASET_IDS:
        datasets_to_try[kb] = DIFY_DATASET_IDS[kb]
    else:
        datasets_to_try = {k: v for k, v in DIFY_DATASET_IDS.items() if v}

    deleted_count = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for sec_id in section_ids_to_delete:
            for kb_key, ds_id in datasets_to_try.items():
                try:
                    resp = await client.delete(
                        f"{DIFY_BASE_URL}/datasets/{ds_id}/documents/{sec_id}",
                        headers={"Authorization": f"Bearer {DIFY_DATASET_API_KEY}"},
                    )
                    if resp.status_code in (200, 204):
                        deleted_count += 1
                        break
                except Exception as e:
                    continue

    # Remove from registry
    if doc_id in FILE_REGISTRY:
        del FILE_REGISTRY[doc_id]
        save_registry()

    if deleted_count > 0 or parent:
        return {
            "status": "ok",
            "message": f"Đã xoá tài liệu và {deleted_count} sections",
            "deleted_sections": deleted_count,
        }

    raise HTTPException(404, "Không tìm thấy tài liệu trong hệ thống")


# --- Logs ---

@app.get("/api/v1/admin/logs")
async def list_logs(page: int = 1, limit: int = 20, channel: Optional[str] = None, department: Optional[str] = None):
    filtered = MOCK_LOGS
    if channel:
        filtered = [l for l in filtered if l["channel"] == channel]
    if department:
        filtered = [l for l in filtered if l["department_routed"] == department]

    total = len(filtered)
    pages = (total + limit - 1) // limit if total > 0 else 1
    start = (page - 1) * limit
    items = filtered[start:start + limit]

    return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}


# --- AI-Powered Query Rewriting ---

import re
import unicodedata

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

QUERY_REWRITE_PROMPT = """Bạn là module rewrite query tiếng Việt cho hệ thống RAG nội bộ của ViHAT Group (công ty CPaaS/Contact Center).

Nhiệm vụ: Nhận câu hỏi gốc từ user (có thể ngắn, viết tắt, mơ hồ) → rewrite thành 2-3 câu hỏi rõ ràng, cụ thể, tối ưu cho vector search.

Quy tắc:
1. Giữ nguyên ý nghĩa gốc
2. Mở rộng viết tắt: "omi" → "OmiCall", "zns" → "Zalo ZNS", "hđ" → "hợp đồng"
3. Nếu hỏi về 1 chủ đề → liệt kê các khía cạnh liên quan. VD: "ốm đau" → hỏi cả chế độ nghỉ bệnh + thăm hỏi nhập viện + mức hỗ trợ
4. Thêm context "tại ViHAT Group" nếu câu hỏi về nội bộ
5. Output CHỈ là các câu hỏi đã rewrite, cách nhau bằng dấu xuống dòng, KHÔNG giải thích

Ví dụ:
Input: "ốm đau thì sao"
Output: Chính sách ốm đau tại ViHAT Group là gì? Chế độ nghỉ bệnh BHXH và thăm hỏi ốm đau tai nạn nhập viện? Mức hỗ trợ thăm hỏi theo từng cấp bậc nhân viên?

Input: "giá omi"
Output: Bảng giá dịch vụ OmiCall tổng đài ảo? Giá các gói PBX 1, PBX 2, Call Center, OMNI Channel? Đơn giá theo user và thời hạn hợp đồng?

Input: "nghỉ phép mấy ngày"
Output: Chính sách nghỉ phép năm tại ViHAT Group được bao nhiêu ngày? Quy trình xin nghỉ phép dài ngày và ngắn ngày? Thưởng phép thâm niên từ năm thứ mấy?"""


async def ai_rewrite_query(query: str) -> str:
    """Use Claude to rewrite query for better RAG retrieval."""
    if not ANTHROPIC_API_KEY:
        print("[QueryRewrite] No ANTHROPIC_API_KEY, skipping AI rewrite")
        return query

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 200,
                    "system": QUERY_REWRITE_PROMPT,
                    "messages": [{"role": "user", "content": query}],
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                rewritten = data["content"][0]["text"].strip()
                print(f"[QueryRewrite] '{query}' => '{rewritten[:120]}...'")
                return rewritten
            else:
                print(f"[QueryRewrite] API error {resp.status_code}: {resp.text[:100]}")
                return query
    except Exception as e:
        print(f"[QueryRewrite] Error: {e}")
        return query


def normalize_query(query: str) -> str:
    """Basic Vietnamese normalization."""
    query = unicodedata.normalize("NFC", query)
    # Simple product alias expansion (fast, no API call needed)
    aliases = {
        "omi": "OmiCall", "esms": "eSMS", "zns": "Zalo ZNS",
        "zalo oa": "Zalo OA", "omiflow": "OmiFlow",
    }
    lower = query.lower()
    for alias, full in aliases.items():
        if alias in lower:
            query = re.sub(re.escape(alias), full, query, flags=re.IGNORECASE)
    return query


# --- Query (Chat) ---

class QueryRequest(BaseModel):
    user_id: str
    query: str
    department: Optional[str] = None
    conversation_id: Optional[str] = None


FILE_REQUEST_PATTERNS = [
    # "gửi" variants
    "gửi file", "gửi cho tôi", "gửi cho anh", "gửi cho em",
    "gửi anh", "gửi tôi", "gửi em",
    "gửi tài liệu", "gửi bảng giá",
    # "cho" variants
    "cho tôi file", "cho anh file", "cho em file",
    "cho tôi tài liệu", "cho anh tài liệu",
    "cho bảng giá", "cho anh bảng giá", "cho tôi bảng giá",
    # "tải/lấy/xem/download"
    "tải file", "lấy file", "xem file", "download file",
    "tải tài liệu", "lấy tài liệu", "tải bảng giá", "lấy bảng giá",
    # file-centric
    "file gốc", "file bảng giá",
]

# These words confirm it's a file request (not just "gửi anh lời chào")
FILE_CONFIRM_WORDS = {"file", "tài liệu", "bảng giá", "báo giá", "document", "tải", "download"}


def detect_file_request(query: str) -> Optional[str]:
    """Detect if user is asking for a file download."""
    query_lower = query.lower()
    for kw in FILE_REQUEST_PATTERNS:
        if kw in query_lower:
            # Must also contain a file-related confirm word
            if any(w in query_lower for w in FILE_CONFIRM_WORDS):
                return query_lower
    return None


SEARCH_ALIASES = {
    "omicall": ["omi", "omicall", "tổng đài", "contact center", "dịch vụ omi"],
    "esms": ["esms", "sms", "brandname", "tin nhắn"],
    "bảng giá": ["bảng giá", "giá", "pricing", "báo giá", "price"],
    "phúc lợi": ["phúc lợi", "phuc loi", "chính sách", "welfare", "chế độ"],
    "nội quy": ["nội quy", "noi quy", "quy định", "lao động"],
}


def find_matching_files(search_term: str) -> list:
    """Find files matching search term with alias expansion."""
    results = []
    search_lower = search_term.lower()

    # Expand with aliases
    expanded = set()
    for word in search_lower.split():
        if len(word) > 1:
            expanded.add(word)
    for key, aliases in SEARCH_ALIASES.items():
        if any(a in search_lower for a in aliases):
            expanded.update(aliases)
            expanded.add(key)

    print(f"[FileSearch] search='{search_term}', expanded={expanded}, registry={len(FILE_REGISTRY)} files")

    seen_files = set()  # Deduplicate by file_name
    for doc_id, entry in FILE_REGISTRY.items():
        fname = entry["file_name"].lower()
        title = entry.get("title", "").lower()
        kb = entry.get("knowledge_base", "").lower()
        searchable = f"{fname} {title} {kb}"
        matches = [t for t in expanded if len(t) > 1 and t in searchable]
        if matches and fname not in seen_files:
            seen_files.add(fname)
            results.append({
                "file_name": entry["file_name"],
                "knowledge_base": entry.get("knowledge_base", ""),
                "download_url": f"http://localhost:8000/api/v1/files/{doc_id}/download",
            })
    return results


@app.post("/api/v1/query")
async def query(req: QueryRequest):
    """Chat via Dify RAG Engine with AI-powered query rewriting + file download detection."""
    import time
    start = time.time()

    if not DIFY_API_KEY:
        raise HTTPException(500, "DIFY_API_KEY not configured")

    # Check if user is requesting a file download
    file_search = detect_file_request(req.query)
    if file_search:
        matching_files = find_matching_files(file_search)
        if matching_files:
            file_list = "\n".join([
                f"- 📎 **{f['file_name']}** ([Tải xuống]({f['download_url']}))"
                for f in matching_files
            ])
            elapsed = int((time.time() - start) * 1000)
            return {
                "status": "success",
                "answer": f"Đây là các file bạn yêu cầu:\n\n{file_list}\n\nBạn có thể click vào link để tải xuống.",
                "sources": [],
                "conversation_id": str(uuid.uuid4()),
                "tokens_used": {"prompt": 0, "completion": 0},
                "processing_time_ms": elapsed,
                "files": matching_files,
            }
        # If no files found, also list all available files (deduplicated)
        if FILE_REGISTRY:
            seen = set()
            lines = []
            for did, e in FILE_REGISTRY.items():
                fn = e["file_name"]
                if fn not in seen:
                    seen.add(fn)
                    kb_label = KB_NAME_MAP.get(e.get("knowledge_base", ""), e.get("knowledge_base", ""))
                    lines.append(f"- 📎 **{fn}** ({kb_label}) - [Tải xuống](http://localhost:8000/api/v1/files/{did}/download)")
            all_files = "\n".join(lines)
            elapsed = int((time.time() - start) * 1000)
            return {
                "status": "success",
                "answer": f"Không tìm thấy file phù hợp với yêu cầu. Đây là danh sách tất cả tài liệu hiện có:\n\n{all_files}",
                "sources": [],
                "conversation_id": str(uuid.uuid4()),
                "tokens_used": {"prompt": 0, "completion": 0},
                "processing_time_ms": elapsed,
            }

    # Step 1: Basic normalization (fast)
    normalized = normalize_query(req.query)

    # Step 2: AI-powered rewrite (only for first message, not follow-ups)
    if not req.conversation_id:
        rewritten = await ai_rewrite_query(normalized)
    else:
        rewritten = normalized

    payload = {
        "inputs": {},
        "query": rewritten,
        "response_mode": "blocking",
        "user": req.user_id,
    }
    if req.conversation_id:
        payload["conversation_id"] = req.conversation_id

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{DIFY_BASE_URL}/chat-messages",
                headers={"Authorization": f"Bearer {DIFY_API_KEY}", "Content-Type": "application/json"},
                json=payload,
            )
            # If 404 (conversation expired), retry without conversation_id
            if resp.status_code == 404 and "conversation_id" in payload:
                print(f"[Dify] Conversation expired, starting new one")
                payload.pop("conversation_id")
                resp = await client.post(
                    f"{DIFY_BASE_URL}/chat-messages",
                    headers={"Authorization": f"Bearer {DIFY_API_KEY}", "Content-Type": "application/json"},
                    json=payload,
                )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(500, f"Dify error: {e}")
    except Exception as e:
        raise HTTPException(500, f"Dify error: {e}")

    # Extract sources
    sources = []
    for r in data.get("metadata", {}).get("retriever_resources", []):
        sources.append({
            "document": r.get("document_name", ""),
            "chunk": r.get("content", "")[:200],
            "score": r.get("score", 0),
        })

    elapsed = int((time.time() - start) * 1000)

    return {
        "status": "success",
        "answer": data.get("answer", ""),
        "sources": sources,
        "conversation_id": data.get("conversation_id", str(uuid.uuid4())),
        "tokens_used": {
            "prompt": data.get("metadata", {}).get("usage", {}).get("prompt_tokens", 0),
            "completion": data.get("metadata", {}).get("usage", {}).get("completion_tokens", 0),
        },
        "processing_time_ms": elapsed,
    }


# --- Health ---

# === Google Sheets Sync endpoints ===

@app.post("/api/v1/sheets/sync")
async def sheets_sync(req: dict):
    """Sync a Google Sheet to Dify KB."""
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent / "api"))
        from services.google_sheets_sync import GoogleSheetsSync

        syncer = GoogleSheetsSync(
            credentials_path=str(Path(__file__).parent / "config" / "google-credentials.json"),
            dify_base_url=DIFY_BASE_URL,
            dify_dataset_api_key=DIFY_DATASET_API_KEY,
        )
        result = await syncer.sync_sheet(
            spreadsheet_id=req.get("spreadsheet_id", ""),
            dataset_id=req.get("dataset_id", ""),
            title=req.get("title", ""),
            force=req.get("force", False),
        )
        return result
    except FileNotFoundError:
        raise HTTPException(400, "Google credentials not found. Place google-credentials.json in config/")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/api/v1/sheets/status")
async def sheets_status():
    """Get sync status of all configured sheets."""
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent / "api"))
        from services.google_sheets_sync import GoogleSheetsSync

        syncer = GoogleSheetsSync(
            credentials_path=str(Path(__file__).parent / "config" / "google-credentials.json"),
            dify_base_url=DIFY_BASE_URL,
            dify_dataset_api_key=DIFY_DATASET_API_KEY,
        )
        return {"sheets": syncer.get_sync_status()}
    except Exception:
        return {"sheets": []}


@app.get("/health")
async def health():
    dify_ok = bool(DIFY_API_KEY)
    return {"status": "ok", "service": "vihat-knowledge-api", "mode": "dev", "dify_connected": dify_ok}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("dev_mock_server:app", host="0.0.0.0", port=8000, reload=True)
