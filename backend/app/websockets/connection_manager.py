from typing import Dict, List, Optional
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("websocket_manager")


class WebSocketConnectionManager:
    """Enterprise WebSocket manager for real-time employee monitoring and notifications."""

    def __init__(self):
        # Map user_id -> List of active WebSocket connections
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # List of all active broadcast sockets
        self.broadcast_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_id: Optional[int] = None):
        await websocket.accept()
        self.broadcast_connections.append(websocket)
        if user_id:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = []
            self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket client connected. User ID: {user_id}. Total: {len(self.broadcast_connections)}")

    def disconnect(self, websocket: WebSocket, user_id: Optional[int] = None):
        if websocket in self.broadcast_connections:
            self.broadcast_connections.remove(websocket)
        if user_id and user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket client disconnected. User ID: {user_id}. Remaining: {len(self.broadcast_connections)}")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send direct message to a specific user's active devices."""
        if user_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, user_id)

    async def broadcast(self, message: dict):
        """Broadcast event to all connected clients."""
        dead_connections = []
        payload = json.dumps(message)
        for connection in self.broadcast_connections:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = WebSocketConnectionManager()
