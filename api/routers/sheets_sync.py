"""Google Sheets sync API endpoints."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class SheetSyncRequest(BaseModel):
    spreadsheet_id: str
    dataset_id: str
    title: str = ""
    force: bool = False


class SheetConfigItem(BaseModel):
    spreadsheet_id: str
    dataset_id: str
    title: str
    sync_interval_minutes: int = 60


@router.post("/sync")
async def sync_sheet(req: SheetSyncRequest):
    """Manually trigger sync of a Google Sheet to Dify KB."""
    from services.google_sheets_sync import GoogleSheetsSync
    from config import settings

    credentials_path = "config/google-credentials.json"
    try:
        syncer = GoogleSheetsSync(
            credentials_path=credentials_path,
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        result = await syncer.sync_sheet(
            spreadsheet_id=req.spreadsheet_id,
            dataset_id=req.dataset_id,
            title=req.title,
            force=req.force,
        )
        return result
    except FileNotFoundError:
        raise HTTPException(
            400,
            "Google credentials not found. Place google-credentials.json in config/",
        )
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/status")
async def sync_status():
    """Get status of all synced sheets."""
    from services.google_sheets_sync import GoogleSheetsSync
    from config import settings

    try:
        syncer = GoogleSheetsSync(
            credentials_path="config/google-credentials.json",
            dify_base_url=settings.DIFY_BASE_URL,
            dify_dataset_api_key=settings.DIFY_DATASET_API_KEY,
        )
        return {"sheets": syncer.get_sync_status()}
    except Exception:
        return {"sheets": []}


@router.post("/preview")
async def preview_sheet(req: SheetSyncRequest):
    """Preview what a Google Sheet looks like as markdown (without uploading)."""
    from services.google_sheets_sync import GoogleSheetsSync
    from config import settings

    try:
        syncer = GoogleSheetsSync(
            credentials_path="config/google-credentials.json",
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
