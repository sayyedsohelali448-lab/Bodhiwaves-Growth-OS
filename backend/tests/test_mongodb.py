import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.mongodb import MongoDBManager
from app.core.config import settings


@pytest.mark.anyio
async def test_mongodb_connection_and_ping():
    """Verify that MongoDB Atlas connects and pings successfully."""
    if not settings.MONGODB_URL:
        pytest.skip("MONGODB_URL not configured")

    mgr = MongoDBManager()
    await mgr.connect()
    try:
        assert mgr.is_connected is True
        assert mgr.status_detail == "connected"
        ping_ok = await mgr.ping()
        assert ping_ok is True
        db = mgr.get_database()
        assert db is not None
        assert db.name == settings.MONGODB_DB_NAME
    finally:
        await mgr.close()


@pytest.mark.anyio
async def test_mongodb_graceful_failure():
    """Verify that an invalid MongoDB URL fails gracefully without crashing."""
    mgr = MongoDBManager()
    # Temporarily point to non-routable/invalid host
    original_url = settings.MONGODB_URL
    try:
        # Invalid host with fast 500ms timeout
        settings.MONGODB_URL = "mongodb://127.0.0.1:27019/?serverSelectionTimeoutMS=500"
        await mgr.connect()
        assert mgr.is_connected is False
        assert mgr.status_detail == "connection_failed"
        ping_ok = await mgr.ping()
        assert ping_ok is False
    finally:
        settings.MONGODB_URL = original_url
        await mgr.close()


@pytest.mark.anyio
async def test_health_endpoint_security_and_mongodb_status():
    """Verify that /api/v1/health reports MongoDB status without exposing credentials."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "online"
        assert "database" in data
        assert "mongodb_atlas" in data
        mongo_info = data["mongodb_atlas"]
        assert "status" in mongo_info
        assert "verified_via_ping" in mongo_info

        # Security check: Ensure credentials or URI are NOT leaked anywhere in the response text
        body_text = res.text.lower()
        assert "mongodb+srv" not in body_text
        assert "mongodb://" not in body_text
        assert "@" not in body_text
        assert "password" not in body_text
