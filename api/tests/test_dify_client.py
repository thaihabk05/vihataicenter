from services.dify_client import DifyClient


def test_extract_sources():
    client = DifyClient()
    data = {
        "metadata": {
            "retriever_resources": [
                {
                    "document_name": "pricing.pdf",
                    "content": "Bảng giá OmiCall Enterprise...",
                    "score": 0.95,
                },
                {
                    "document_name": "catalog.docx",
                    "content": "Tính năng OmiCall...",
                    "score": 0.88,
                },
            ]
        }
    }
    sources = client._extract_sources(data)
    assert len(sources) == 2
    assert sources[0]["document"] == "pricing.pdf"
    assert sources[0]["score"] == 0.95


def test_extract_sources_empty():
    client = DifyClient()
    data = {"metadata": {}}
    sources = client._extract_sources(data)
    assert sources == []
