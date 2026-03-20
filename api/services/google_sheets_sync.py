"""Google Sheets → Dify Knowledge Base sync service.

Phương án B: Cron job đọc Google Sheets → convert → upload Dify.
Uses Google Service Account for authentication.

Setup:
1. Create Service Account at https://console.cloud.google.com
2. Enable Google Sheets API
3. Download JSON key → save as config/google-credentials.json
4. Share each Google Sheet with the service account email
5. Configure GOOGLE_SHEETS_CONFIG in .env or admin panel
"""

import asyncio
import hashlib
import json
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Sync state file — tracks what we've synced to avoid duplicates
SYNC_STATE_PATH = Path(__file__).parent.parent.parent / "data" / "sheets_sync_state.json"


class GoogleSheetsSync:
    """Sync Google Sheets data to Dify Knowledge Bases."""

    def __init__(
        self,
        credentials_path: str,
        dify_base_url: str,
        dify_dataset_api_key: str,
    ):
        self.credentials_path = credentials_path
        self.dify_base_url = dify_base_url
        self.dify_api_key = dify_dataset_api_key
        self._sheets_service = None
        self._sync_state = self._load_sync_state()

    def _get_sheets_service(self):
        """Lazy-init Google Sheets API service."""
        if self._sheets_service is None:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build

            creds = Credentials.from_service_account_file(
                self.credentials_path,
                scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"],
            )
            self._sheets_service = build("sheets", "v4", credentials=creds)
        return self._sheets_service

    def _load_sync_state(self) -> dict:
        """Load sync state from disk."""
        if SYNC_STATE_PATH.exists():
            try:
                return json.loads(SYNC_STATE_PATH.read_text())
            except Exception:
                pass
        return {}

    def _save_sync_state(self):
        """Persist sync state to disk."""
        SYNC_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        SYNC_STATE_PATH.write_text(json.dumps(self._sync_state, ensure_ascii=False, indent=2))

    def read_sheet(self, spreadsheet_id: str, range_name: str = "") -> list[list[str]]:
        """Read data from a Google Sheet.

        Args:
            spreadsheet_id: The ID from the sheet URL (between /d/ and /edit)
            range_name: Optional A1 notation range (e.g., "Sheet1!A1:Z100")

        Returns:
            List of rows, each row is a list of cell values.
        """
        service = self._get_sheets_service()

        if not range_name:
            # Get all sheet names first
            meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
            sheets = meta.get("sheets", [])
            all_data = []
            for sheet in sheets:
                title = sheet["properties"]["title"]
                result = (
                    service.spreadsheets()
                    .values()
                    .get(spreadsheetId=spreadsheet_id, range=title)
                    .execute()
                )
                rows = result.get("values", [])
                if rows:
                    all_data.append(f"## {title}")
                    all_data.extend(rows)
            return all_data
        else:
            result = (
                service.spreadsheets()
                .values()
                .get(spreadsheetId=spreadsheet_id, range=range_name)
                .execute()
            )
            return result.get("values", [])

    def sheet_to_markdown(self, spreadsheet_id: str, title: str = "") -> str:
        """Convert entire Google Sheet to markdown text."""
        service = self._get_sheets_service()
        meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheet_title = title or meta.get("properties", {}).get("title", "Google Sheet")

        result_parts = [f"# {sheet_title}\n"]

        for sheet in meta.get("sheets", []):
            tab_title = sheet["properties"]["title"]
            data = (
                service.spreadsheets()
                .values()
                .get(spreadsheetId=spreadsheet_id, range=tab_title)
                .execute()
            )
            rows = data.get("values", [])
            if not rows:
                continue

            result_parts.append(f"## {tab_title}\n")

            for row in rows:
                cells = [str(c).strip() if c else "" for c in row]
                non_empty = [c for c in cells if c]
                if non_empty:
                    result_parts.append(" | ".join(non_empty))

            result_parts.append("")

        return "\n".join(result_parts)

    def compute_hash(self, content: str) -> str:
        """Compute hash of content for change detection."""
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    async def sync_sheet(
        self,
        spreadsheet_id: str,
        dataset_id: str,
        title: str = "",
        force: bool = False,
    ) -> dict:
        """Sync a Google Sheet to a Dify Knowledge Base.

        Only uploads if content has changed (or force=True).

        Returns:
            {synced: bool, sections: int, message: str}
        """
        import httpx

        try:
            # Read and convert sheet — offload blocking Google API call to thread
            markdown = await asyncio.to_thread(self.sheet_to_markdown, spreadsheet_id, title)
            content_hash = self.compute_hash(markdown)

            # Check if already synced with same content
            state_key = f"{spreadsheet_id}:{dataset_id}"
            if not force and self._sync_state.get(state_key, {}).get("hash") == content_hash:
                return {
                    "synced": False,
                    "sections": 0,
                    "message": "No changes detected",
                }

            # Split into sections
            sections = self._split_sections(markdown, title or "Google Sheet")

            # Delete old documents from this sheet
            old_doc_ids = self._sync_state.get(state_key, {}).get("doc_ids", [])
            async with httpx.AsyncClient(timeout=60.0) as client:
                for doc_id in old_doc_ids:
                    await client.delete(
                        f"{self.dify_base_url}/datasets/{dataset_id}/documents/{doc_id}",
                        headers={"Authorization": f"Bearer {self.dify_api_key}"},
                    )

                # Upload new sections
                new_doc_ids = []
                for section in sections:
                    resp = await client.post(
                        f"{self.dify_base_url}/datasets/{dataset_id}/document/create_by_text",
                        headers={
                            "Authorization": f"Bearer {self.dify_api_key}",
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
                        doc_id = resp.json().get("document", {}).get("id")
                        if doc_id:
                            new_doc_ids.append(doc_id)

            # Update sync state
            self._sync_state[state_key] = {
                "hash": content_hash,
                "doc_ids": new_doc_ids,
                "title": title,
                "spreadsheet_id": spreadsheet_id,
                "dataset_id": dataset_id,
                "synced_at": datetime.now(timezone.utc).isoformat(),
            }
            await asyncio.to_thread(self._save_sync_state)

            return {
                "synced": True,
                "sections": len(sections),
                "message": f"Synced {len(sections)} sections",
            }

        except Exception as e:
            logger.error(f"Google Sheets sync error: {e}")
            return {"synced": False, "sections": 0, "message": str(e)}

    def _split_sections(self, markdown: str, title: str) -> list[dict]:
        """Split markdown into semantic sections."""
        lines = markdown.split("\n")
        sections = []
        current_section = []
        current_heading = title
        pattern = re.compile(r"^(#{1,3}\s+|[IVX]+\.\s+|\d+\.\s+[A-ZĐ])")

        for line in lines:
            is_heading = bool(pattern.match(line.strip()))
            if is_heading and current_section:
                text = "\n".join(current_section).strip()
                if text and len(text) > 50:
                    sections.append({
                        "name": f"{title} — {current_heading}",
                        "text": f"# {title}\n## {current_heading}\n\n{text}",
                    })
                current_section = []
                current_heading = line.strip().lstrip("#").strip()
            current_section.append(line)

        if current_section:
            text = "\n".join(current_section).strip()
            if text and len(text) > 50:
                sections.append({
                    "name": f"{title} — {current_heading}",
                    "text": f"# {title}\n## {current_heading}\n\n{text}",
                })

        # Merge small sections
        merged = []
        buf = None
        for sec in sections:
            if buf:
                if len(buf["text"]) < 200:
                    buf["text"] += "\n\n" + sec["text"]
                    buf["name"] = sec["name"]
                else:
                    merged.append(buf)
                    buf = sec
            else:
                buf = sec
        if buf:
            merged.append(buf)

        return merged if merged else [{"name": title, "text": markdown}]

    def get_sync_status(self) -> list[dict]:
        """Get status of all synced sheets."""
        return [
            {
                "spreadsheet_id": v["spreadsheet_id"],
                "dataset_id": v["dataset_id"],
                "title": v.get("title", ""),
                "synced_at": v.get("synced_at", ""),
                "hash": v.get("hash", ""),
                "sections": len(v.get("doc_ids", [])),
            }
            for v in self._sync_state.values()
        ]
