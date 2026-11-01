from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db
from app.database.mongodb import mongo_manager
from app.core.config import settings

router = APIRouter(tags=["System Health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint verifying API uptime, PostgreSQL primary database,
    and MongoDB Atlas secondary database connectivity.
    Credentials are never exposed.
    """
    db_status = "unhealthy"
    db_version = "unknown"
    try:
        version_result = db.execute(text("SELECT version();")).scalar()
        db_status = "healthy"
        db_version = str(version_result)
    except Exception as e:
        db_status = f"unhealthy: {type(e).__name__}"

    # MongoDB Atlas status (verified during lifespan and persistent connection)
    mongo_status = mongo_manager.status_detail
    mongo_ok = mongo_manager.is_connected

    return {
        "status": "online",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": {
            "status": db_status,
            "version": db_version,
            "engine": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite"
        },
        "mongodb_atlas": {
            "status": mongo_status,
            "verified_via_ping": mongo_ok,
            "database_name": settings.MONGODB_DB_NAME if mongo_ok else None
        },
        "whatsapp_integration": {
            "mode": "mock" if settings.WHATSAPP_MOCK_MODE else "official_meta_cloud_api",
            "api_version": settings.WHATSAPP_API_VERSION
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
