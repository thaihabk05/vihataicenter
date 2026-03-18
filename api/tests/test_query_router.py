import pytest
from unittest.mock import MagicMock

from services.query_router import QueryRouter


@pytest.fixture
def router():
    return QueryRouter()


@pytest.fixture
def sales_user():
    user = MagicMock()
    user.department = "sales"
    return user


@pytest.fixture
def hr_user():
    user = MagicMock()
    user.department = "hr"
    return user


@pytest.fixture
def management_user():
    user = MagicMock()
    user.department = "management"
    return user


@pytest.mark.asyncio
async def test_route_sales_query(router, sales_user):
    result = await router.route("Cho tôi bảng giá OmiCall Enterprise", sales_user)
    assert "sales" in result
    assert "general" in result


@pytest.mark.asyncio
async def test_route_hr_query(router, hr_user):
    result = await router.route("Quy trình xin nghỉ phép", hr_user)
    assert "hr" in result


@pytest.mark.asyncio
async def test_route_accounting_query(router, sales_user):
    """Sales user asking accounting question should route to general (no access to accounting)."""
    result = await router.route("Xuất hóa đơn VAT", sales_user)
    # Sales user can't access accounting KB, falls back
    assert "general" in result


@pytest.mark.asyncio
async def test_route_management_all_access(router, management_user):
    result = await router.route("Cho tôi bảng giá OmiCall", management_user)
    assert "sales" in result


@pytest.mark.asyncio
async def test_route_generic_query(router, sales_user):
    result = await router.route("Xin chào", sales_user)
    assert "sales" in result
    assert "general" in result
