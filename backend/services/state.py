"""
services/state.py
All shared mutable state. Import from here, never redefine elsewhere.
"""

import asyncio
import threading
import cv2
from fastapi import WebSocket

# ── camera ────────────────────────────────────────────────────────────────────
cap: cv2.VideoCapture | None = None
cap_lock = threading.Lock()

latest_frame: bytes | None = None
frame_lock = threading.Lock()
last_frame_ts: float = 0.0

current_source: dict[str, int | str | None] = {
    "type": None, "url": None, "camera_id": None,
}
source_lock = threading.Lock()
simulation_mode: bool = False

# ── zones ─────────────────────────────────────────────────────────────────────
zones_cache: list[dict] = []
zones_lock = threading.Lock()

# ── websocket clients ─────────────────────────────────────────────────────────
zone_ws_clients:  set[WebSocket] = set()
zone_ws_lock      = threading.Lock()

video_ws_clients: set[WebSocket] = set()
video_ws_lock     = threading.Lock()

# ── event loop (assigned in lifespan) ────────────────────────────────────────
_main_loop: asyncio.AbstractEventLoop | None = None