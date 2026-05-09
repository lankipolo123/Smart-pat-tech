"""
services/zones.py
Zone cache management and WebSocket broadcasting.
"""

import asyncio
import json

from fastapi import WebSocket
from services.auth import get_conn
import services.state as S


def load_zones():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM zones").fetchall() or []
    cache = [
        {
            "id":         r["id"],
            "slot":       r["slot"],
            "points":     json.loads(r["points"]),
            "zone_type":  r["zone_type"],
            "occupied":   bool(r["occupied"]),
            "entry_time": r["entry_time"],
        }
        for r in rows
    ]
    with S.zones_lock:
        S.zones_cache.clear()
        S.zones_cache.extend(cache)


async def _safe_send_text(ws: WebSocket, data: str) -> bool:
    try:
        await ws.send_text(data)
        return True
    except Exception:
        return False


async def broadcast_zones():
    with S.zones_lock:
        payload = json.dumps(S.zones_cache)
    with S.zone_ws_lock:
        dead = {ws for ws in S.zone_ws_clients if not await _safe_send_text(ws, payload)}
        S.zone_ws_clients.difference_update(dead)


def _schedule(coro):
    if S._main_loop and not S._main_loop.is_closed():
        asyncio.run_coroutine_threadsafe(coro, S._main_loop)


def notify_zones_changed():
    if S.zone_ws_clients:
        _schedule(broadcast_zones())


def schedule(coro):
    """Public schedule helper for use in detector."""
    _schedule(coro)