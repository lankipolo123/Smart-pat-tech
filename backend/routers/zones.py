"""routers/zones.py — /zones routes"""

import json

from fastapi import APIRouter, HTTPException

from services.auth import get_conn
from services.zones import load_zones, notify_zones_changed

router = APIRouter()


@router.get("/zones")
def get_zones():
    import services.state as S
    with S.zones_lock:
        return list(S.zones_cache)


@router.post("/zones")
def create_zone(data: dict):
    slot      = data.get("slot")
    points    = data.get("points")
    zone_type = data.get("zone_type", "parking")
    if not slot or not points:
        raise HTTPException(400, "slot and points are required")
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO zones (slot, points, zone_type) VALUES (?, ?, ?)",
            (slot, json.dumps(points), zone_type),
        )
        zone_id = int(cur.lastrowid or 0)
    load_zones()
    notify_zones_changed()
    return {"ok": True, "id": zone_id}


@router.put("/zones/{zone_id}")
def update_zone(zone_id: int, data: dict):
    slot      = data.get("slot")
    points    = data.get("points")
    zone_type = data.get("zone_type", "parking")
    if not slot or not points:
        raise HTTPException(400, "slot and points are required")
    with get_conn() as conn:
        if not conn.execute("SELECT id FROM zones WHERE id=?", (zone_id,)).fetchone():
            raise HTTPException(404, "Zone not found")
        conn.execute(
            "UPDATE zones SET slot=?, points=?, zone_type=? WHERE id=?",
            (slot, json.dumps(points), zone_type, zone_id),
        )
    load_zones()
    notify_zones_changed()
    return {"ok": True}


@router.delete("/zones/{zone_id}")
def delete_zone(zone_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM zones WHERE id=?", (zone_id,))
    load_zones()
    notify_zones_changed()
    return {"ok": True}