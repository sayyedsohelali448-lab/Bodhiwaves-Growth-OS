import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.api.v1.router import api_router
from app.websockets.connection_manager import ws_manager
from app.database.base import Base
from app.database.session import engine
from app.database.mongodb import mongo_manager
import app.models  # Registers all models

# Ensure PostgreSQL database tables exist (Primary database)
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas (Graceful fallback if unavailable)
    await mongo_manager.connect()
    yield
    # Shutdown: Cleanly close MongoDB Atlas client
    await mongo_manager.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware (Restricted to configured local and production origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Real-Time WebSocket Channel for Live Tracking & Notifications
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client heartbeat or ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.websocket("/ws/{user_id}")
async def websocket_user_endpoint(websocket: WebSocket, user_id: int):
    await ws_manager.connect(websocket, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, user_id=user_id)
    except Exception:
        ws_manager.disconnect(websocket, user_id=user_id)


# Optional Static Mount for the HTML starter (if requested to browse via backend)
PARENT_DIR = Path(__file__).resolve().parent.parent.parent
HTML_DIR = PARENT_DIR / "Bodhiwaves_Growth_OS_HTML"
if HTML_DIR.exists():
    assets_path = HTML_DIR / "assets"
    if assets_path.exists():
        app.mount("/legacy/assets", StaticFiles(directory=str(assets_path)), name="legacy_assets")
    pages_path = HTML_DIR / "pages"
    if pages_path.exists():
        app.mount("/legacy/pages", StaticFiles(directory=str(pages_path), html=True), name="legacy_pages")


@app.get("/", include_in_schema=False)
def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "api_docs": "/docs",
        "health_check": f"{settings.API_V1_STR}/health"
    }
