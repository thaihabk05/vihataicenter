import json

import httpx

from config import settings


class DifyClient:
    """Client to communicate with Dify RAG Engine."""

    def __init__(self):
        self.base_url = settings.DIFY_BASE_URL
        self.api_keys = {
            "sales": settings.DIFY_API_KEY_SALES,
            "hr": settings.DIFY_API_KEY_HR,
            "accounting": settings.DIFY_API_KEY_ACCOUNTING,
            "general": settings.DIFY_API_KEY_GENERAL,
            "management": settings.DIFY_API_KEY_MANAGEMENT,
        }

    async def chat(
        self,
        query: str,
        department: str,
        conversation_id: str | None = None,
        user_id: str = "default",
    ) -> dict:
        """Send query to Dify Chat API.

        Args:
            query: User's question
            department: Department to select correct API key/app
            conversation_id: Conversation ID to maintain context
            user_id: User ID for tracking

        Returns:
            dict with answer, sources, conversation_id, tokens
        """
        api_key = self.api_keys.get(department, self.api_keys["general"])

        payload = {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "user": user_id,
        }

        if conversation_id:
            payload["conversation_id"] = conversation_id

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.base_url}/chat-messages",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return {
            "answer": data.get("answer", ""),
            "conversation_id": data.get("conversation_id", ""),
            "sources": self._extract_sources(data),
            "tokens": {
                "prompt": data.get("metadata", {})
                .get("usage", {})
                .get("prompt_tokens", 0),
                "completion": data.get("metadata", {})
                .get("usage", {})
                .get("completion_tokens", 0),
            },
        }

    def _extract_sources(self, data: dict) -> list:
        """Extract source documents from Dify response metadata."""
        sources = []
        retriever_resources = data.get("metadata", {}).get("retriever_resources", [])
        for resource in retriever_resources:
            sources.append(
                {
                    "document": resource.get("document_name", ""),
                    "chunk": resource.get("content", "")[:200],
                    "score": resource.get("score", 0),
                }
            )
        return sources

    async def upload_document(
        self,
        file_path: str,
        dataset_id: str,
        chunk_config: dict | None = None,
    ) -> dict:
        """Upload document to Dify Knowledge Base."""
        default_chunk = {
            "indexing_technique": "high_quality",
            "process_rule": {
                "mode": "automatic",
            },
        }
        chunk_config = chunk_config or default_chunk

        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(file_path, "rb") as f:
                response = await client.post(
                    f"{self.base_url}/datasets/{dataset_id}/document/create_by_file",
                    headers={
                        "Authorization": f"Bearer {settings.DIFY_DATASET_API_KEY}",
                    },
                    files={"file": f},
                    data={"data": json.dumps(chunk_config)},
                )
            response.raise_for_status()
            return response.json()

    async def get_datasets(self) -> list:
        """List all Dify datasets (Knowledge Bases)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/datasets",
                headers={
                    "Authorization": f"Bearer {settings.DIFY_DATASET_API_KEY}",
                },
                params={"page": 1, "limit": 100},
            )
            response.raise_for_status()
            return response.json().get("data", [])


dify_client = DifyClient()
