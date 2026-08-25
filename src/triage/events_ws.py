"""
WebSocket Event Manager for Live Dashboard Streaming.
Broadcasts real-time incident lifecycle events to connected UI clients.
"""

from typing import List
import json
from fastapi import WebSocket, WebSocketDisconnect


class EventWebSocketManager:
    """Manages active WebSocket connections and broadcasts incident stage events."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_event(self, event_type: str, incident_id: str, stage: str, step_index: int, payload: dict):
        event_message = {
            "event_type": event_type,
            "incident_id": incident_id,
            "stage": stage,
            "step_index": step_index,
            "payload": payload,
        }
        to_remove = []
        for connection in self.active_connections:
            try:
                await connection.send_json(event_message)
            except Exception:
                to_remove.append(connection)

        for conn in to_remove:
            self.disconnect(conn)


ws_manager = EventWebSocketManager()
