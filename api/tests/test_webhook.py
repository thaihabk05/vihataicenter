import uuid
from unittest.mock import AsyncMock, patch, MagicMock

import pytest


@pytest.mark.asyncio
async def test_omiflow_webhook_non_text(client):
    """Test webhook with non-text message type returns ok with no reply."""
    payload = {
        "event": "message",
        "channel": "zalo_oa",
        "sender_id": "test_user",
        "message": {"type": "image", "content": ""},
    }
    response = await client.post("/api/v1/webhook/omiflow", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["reply"] is None


@pytest.mark.asyncio
async def test_omiflow_webhook_empty_message(client):
    """Test webhook with empty text message."""
    payload = {
        "event": "message",
        "channel": "zalo_oa",
        "sender_id": "test_user",
        "message": {"type": "text", "content": "   "},
    }
    response = await client.post("/api/v1/webhook/omiflow", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["reply"] is None


@pytest.mark.asyncio
async def test_omiflow_webhook_non_message_event(client):
    """Test webhook with non-message event."""
    payload = {
        "event": "typing",
        "channel": "zalo_oa",
        "sender_id": "test_user",
        "message": {"type": "text", "content": "Hello"},
    }
    response = await client.post("/api/v1/webhook/omiflow", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["reply"] is None


@pytest.mark.asyncio
async def test_omiflow_webhook_unregistered_user(client):
    """Test webhook with unregistered sender returns registration message."""
    mock_user = None

    with patch(
        "routers.webhook.get_user_by_zalo_id", new_callable=AsyncMock, return_value=mock_user
    ):
        payload = {
            "event": "message",
            "channel": "zalo_oa",
            "sender_id": "unknown_user_999",
            "sender_name": "Unknown",
            "message": {"type": "text", "content": "Hello"},
        }
        response = await client.post("/api/v1/webhook/omiflow", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "chưa được đăng ký" in data["reply"]["content"]


@pytest.mark.asyncio
async def test_omiflow_webhook_reset_command(client):
    """Test webhook with /reset command clears session."""
    mock_user = MagicMock()
    mock_user.id = uuid.uuid4()
    mock_user.department = "sales"
    mock_user.role = "member"

    with (
        patch(
            "routers.webhook.get_user_by_zalo_id",
            new_callable=AsyncMock,
            return_value=mock_user,
        ),
        patch("routers.webhook.check_rate_limit", new_callable=AsyncMock),
        patch(
            "routers.webhook.session_manager.clear_session", new_callable=AsyncMock
        ),
    ):
        payload = {
            "event": "message",
            "channel": "zalo_oa",
            "sender_id": "test_user_123",
            "message": {"type": "text", "content": "/reset"},
        }
        response = await client.post("/api/v1/webhook/omiflow", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "bắt đầu" in data["reply"]["content"].lower() or "mới" in data["reply"]["content"].lower()


@pytest.mark.asyncio
async def test_omiflow_webhook_help_command(client):
    """Test webhook with /help command returns help text."""
    mock_user = MagicMock()
    mock_user.id = uuid.uuid4()
    mock_user.department = "sales"
    mock_user.role = "member"

    with (
        patch(
            "routers.webhook.get_user_by_zalo_id",
            new_callable=AsyncMock,
            return_value=mock_user,
        ),
        patch("routers.webhook.check_rate_limit", new_callable=AsyncMock),
    ):
        payload = {
            "event": "message",
            "channel": "zalo_oa",
            "sender_id": "test_user_123",
            "message": {"type": "text", "content": "/help"},
        }
        response = await client.post("/api/v1/webhook/omiflow", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["reply"]["content"]  # Help text is not empty
