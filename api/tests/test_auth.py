from services.auth_service import (
    create_access_token,
    decode_access_token,
    has_permission,
)


def test_create_and_decode_token():
    token = create_access_token("user_123", "admin")
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "user_123"
    assert payload["role"] == "admin"


def test_decode_invalid_token():
    payload = decode_access_token("invalid-token")
    assert payload is None


def test_permissions_super_admin():
    assert has_permission("super_admin", "configure_system")
    assert has_permission("super_admin", "query_all_kb")
    assert has_permission("super_admin", "manage_users")


def test_permissions_member():
    assert has_permission("member", "query_own_kb")
    assert has_permission("member", "view_own_stats")
    assert not has_permission("member", "upload_document")
    assert not has_permission("member", "manage_users")
    assert not has_permission("member", "configure_system")


def test_permissions_viewer():
    assert has_permission("viewer", "query_own_kb")
    assert not has_permission("viewer", "upload_document")
    assert not has_permission("viewer", "view_own_stats")
