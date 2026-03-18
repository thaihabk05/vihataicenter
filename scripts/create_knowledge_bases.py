"""Create Knowledge Bases in Dify via API."""
import asyncio
import httpx
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))
from config import settings

KNOWLEDGE_BASES = [
    {
        "name": "ViHAT Sales Knowledge",
        "description": "Sản phẩm, giá, case study, proposal templates",
    },
    {
        "name": "ViHAT HR Knowledge",
        "description": "Nội quy, quy trình nhân sự, phúc lợi",
    },
    {
        "name": "ViHAT Accounting Knowledge",
        "description": "Nghiệp vụ kế toán, chính sách tài chính",
    },
    {
        "name": "ViHAT General Knowledge",
        "description": "SOP chung, quy trình liên phòng ban",
    },
    {
        "name": "ViHAT Management Knowledge",
        "description": "KPI, báo cáo, quy trình phê duyệt",
    },
]


async def create_knowledge_bases():
    async with httpx.AsyncClient(timeout=30.0) as client:
        for kb in KNOWLEDGE_BASES:
            print(f"Creating KB: {kb['name']}...")
            try:
                response = await client.post(
                    f"{settings.DIFY_BASE_URL}/datasets",
                    headers={
                        "Authorization": f"Bearer {settings.DIFY_DATASET_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "name": kb["name"],
                        "description": kb["description"],
                        "indexing_technique": "high_quality",
                        "permission": "all_team_members",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    print(f"  Created: {data.get('id')}")
                else:
                    print(f"  Error: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"  Failed: {e}")


if __name__ == "__main__":
    asyncio.run(create_knowledge_bases())
