"""routers/zones.py — /zones routes"""

import json

from fastapi import APIRouter, HTTPException, Query

from services.auth import get_conn
from services.zones import get_active_camera_id, load_zones, notify_zones_changed, read_zones

router = APIRouter()


@router.get("/zones")
def get_zones(camera_id: int | None = Query(default=None)):
    return read_zones(camera_id)


@router.post("/zones")
def create_zone(data: dict):
    slot      = data.get("slot")
    points    = data.get("points")
    zone_type = data.get("zone_type", "parking")
    camera_id = data.get("camera_id") or get_active_camera_id()
    if not slot or not points:
        raise HTTPException(400, "slot and points are required")
    if camera_id is None:
        raise HTTPException(400, "camera_id is required")
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO zones (camera_id, slot, points, zone_type) VALUES (?, ?, ?, ?)",
            (camera_id, slot, json.dumps(points), zone_type),
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
    camera_id = data.get("camera_id") or get_active_camera_id()
    if not slot or not points:
        raise HTTPException(400, "slot and points are required")
    if camera_id is None:
        raise HTTPException(400, "camera_id is required")
    with get_conn() as conn:
        if not conn.execute("SELECT id FROM zones WHERE id=?", (zone_id,)).fetchone():
            raise HTTPException(404, "Zone not found")
        conn.execute(
            "UPDATE zones SET camera_id=?, slot=?, points=?, zone_type=? WHERE id=?",
            (camera_id, slot, json.dumps(points), zone_type, zone_id),
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
