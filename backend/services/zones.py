"""
services/zones.py
Zone cache management and WebSocket broadcasting.

Fixes applied:
  - broadcast_zones: snapshot clients BEFORE awaiting — never hold
    threading.Lock across an await (causes deadlock / RuntimeError).
  - notify_zones_changed: read zone_ws_clients under the lock to avoid
    "Set changed size during iteration" RuntimeError.
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

    # FIX: snapshot the set under the lock, then release BEFORE any await.
    # Holding a threading.Lock across await suspends the coroutine while the
    # lock is still held, which deadlocks any other thread trying to acquire it.
    with S.zone_ws_lock:
        clients = set(S.zone_ws_clients)

    dead = set()
    for ws in clients:
        ok = await _safe_send_text(ws, payload)
        if not ok:
            dead.add(ws)

    if dead:
        with S.zone_ws_lock:
            S.zone_ws_clients.difference_update(dead)


def _schedule(coro):
    if S._main_loop and not S._main_loop.is_closed():
        asyncio.run_coroutine_threadsafe(coro, S._main_loop)


def notify_zones_changed():
    # FIX: read zone_ws_clients under the lock — without it another thread
    # can remove a client between the bool() check and the actual iteration
    # inside broadcast_zones, causing "Set changed size during iteration".
    with S.zone_ws_lock:
        has_clients = bool(S.zone_ws_clients)
    if has_clients:
        _schedule(broadcast_zones())


def schedule(coro):
    """Public schedule helper for use in detector."""
    _schedule(coro)