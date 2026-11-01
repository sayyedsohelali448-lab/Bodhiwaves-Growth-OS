import logging
from typing import Optional
from pymongo import AsyncMongoClient
from app.core.config import settings

logger = logging.getLogger("bodhiwaves.mongodb")


class MongoDBManager:
    """
    Manages MongoDB Atlas asynchronous client lifecycle.
    Keeps PostgreSQL as primary; provides graceful fallback if MongoDB is unavailable.
    Never prints or logs database credentials.
    """

    def __init__(self):
        self.client: Optional[AsyncMongoClient] = None
        self.db = None
        self.is_connected: bool = False
        self.status_detail: str = "uninitialized"

    async def connect(self):
        if not settings.MONGODB_URL:
            self.status_detail = "not_configured"
            self.is_connected = False
            logger.info("MongoDB Atlas URL not configured. Operating in PostgreSQL-only mode.")
            return

        try:
            # 5-second timeout to avoid blocking FastAPI startup
            self.client = AsyncMongoClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )

            # Verification ping
            ping_result = await self.client.admin.command("ping")
            if ping_result.get("ok") == 1:
                self.db = self.client[settings.MONGODB_DB_NAME]
                self.is_connected = True
                self.status_detail = "connected"
                logger.info("MongoDB Atlas connection established and verified via ping.")
            else:
                self.is_connected = False
                self.status_detail = "ping_failed"
                logger.warning("MongoDB Atlas ping returned non-ok status.")
        except Exception as e:
            self.is_connected = False
            self.status_detail = "connection_failed"
            # Secure log: log only exception type, never URI or credentials
            logger.warning(
                f"MongoDB Atlas connection failed: {type(e).__name__}. Continuing in PostgreSQL-only mode."
            )

    async def close(self):
        if self.client:
            try:
                await self.client.close()
            except Exception:
                pass
            self.client = None
            self.db = None
            self.is_connected = False
            self.status_detail = "closed"
            logger.info("MongoDB Atlas client closed.")

    async def ping(self) -> bool:
        if not self.is_connected or not self.client:
            return False
        try:
            result = await self.client.admin.command("ping")
            return result.get("ok") == 1
        except Exception:
            return False

    def get_database(self):
        return self.db


mongo_manager = MongoDBManager()


async def get_mongo_db():
    """FastAPI dependency for accessing MongoDB Atlas database instance."""
    return mongo_manager.get_database()
