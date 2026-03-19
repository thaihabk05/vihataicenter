"""Google Drive & Sheets sync API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

CREDENTIALS_PATH = "config/google-credentials.json"


# --- Google Sheets sync ---

class SheetSyncRequest(BaseModel):
    spreadsheet_id: str
    dataset_id: str
    title: str = ""
    force: bool = False


@router.post("/sheet/sync")
async def sync_sheet(req: SheetSyncRequest):
    """Sync a single Google Sheet to Dify KB."""
    from services.google_sheets_sync import GoogleSheetsSync
    from config import settings

    try:
        syncer = GoogleSheetsSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        return await syncer.sync_sheet(
            spreadsheet_id=req.spreadsheet_id,
            dataset_id=req.dataset_id,
            title=req.title,
            force=req.force,
        )
    except FileNotFoundError:
        raise HTTPException(400, "Google credentials not found. Place google-credentials.json in config/")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/sheet/preview")
async def preview_sheet(req: SheetSyncRequest):
    """Preview Google Sheet as markdown without uploading."""
    from services.google_sheets_sync import GoogleSheetsSync
    from config import settings

    try:
        syncer = GoogleSheetsSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        markdown = syncer.sheet_to_markdown(req.spreadsheet_id, req.title)
        sections = syncer._split_sections(markdown, req.title or "Preview")
        return {
            "markdown_preview": markdown[:2000],
            "total_chars": len(markdown),
            "sections": len(sections),
            "section_names": [s["name"] for s in sections],
        }
    except FileNotFoundError:
        raise HTTPException(400, "Google credentials not found")
    except Exception as e:
        raise HTTPException(500, str(e))


# --- Google Drive folder sync ---

class FolderSyncRequest(BaseModel):
    folder_id: str
    dataset_id: str
    force: bool = False


@router.post("/folder/sync")
async def sync_folder(req: FolderSyncRequest):
    """Sync all files in a Google Drive folder to Dify KB.

    Supports: Google Sheets, DOCX, PDF, XLSX, TXT, MD.
    Auto pre-processes Excel/DOCX to markdown for better RAG.
    Only uploads changed files (hash-based change detection).
    """
    from services.google_drive_sync import GoogleDriveSync
    from config import settings

    try:
        syncer = GoogleDriveSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        return await syncer.sync_folder(
            folder_id=req.folder_id,
            dataset_id=req.dataset_id,
            force=req.force,
        )
    except FileNotFoundError:
        raise HTTPException(400, "Google credentials not found. Place google-credentials.json in config/")
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/folder/list")
async def list_folder(req: FolderSyncRequest):
    """List all supported files in a Google Drive folder (preview before sync)."""
    from services.google_drive_sync import GoogleDriveSync
    from config import settings

    try:
        syncer = GoogleDriveSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        files = syncer.list_folder(req.folder_id)
        return {
            "folder_id": req.folder_id,
            "files_count": len(files),
            "files": [
                {
                    "id": f["id"],
                    "name": f["name"],
                    "path": f.get("path", f["name"]),
                    "type": SUPPORTED_MIMES_LABELS.get(f["mimeType"], f["mimeType"]),
                    "modified": f.get("modifiedTime", ""),
                }
                for f in files
            ],
        }
    except FileNotFoundError:
        raise HTTPException(400, "Google credentials not found")
    except Exception as e:
        raise HTTPException(500, str(e))


# --- Status (both sheets + folders) ---

@router.get("/status")
async def sync_status():
    """Get sync status for all configured sheets and folders."""
    from config import settings

    result = {"sheets": [], "folders": []}

    try:
        from services.google_sheets_sync import GoogleSheetsSync
        syncer = GoogleSheetsSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        result["sheets"] = syncer.get_sync_status()
    except Exception:
        pass

    try:
        from services.google_drive_sync import GoogleDriveSync
        syncer = GoogleDriveSync(
            credentials_path=CREDENTIALS_PATH,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        result["folders"] = syncer.get_sync_status()
    except Exception:
        pass

    return result


SUPPORTED_MIMES_LABELS = {
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
    "application/pdf": "PDF",
    "text/plain": "Text",
    "text/markdown": "Markdown",
}
