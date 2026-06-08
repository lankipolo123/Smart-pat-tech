"""routers/cameras.py — /cameras, /sources, /webcam, /connect, /upload-video"""

import json
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Response, UploadFile

from services.auth import get_conn
from services.camera import switch_capture
from services.db import switch_payload, upsert_video_source
from services.zones import load_zones, notify_zones_changed
import services.state as S

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def _cam_row(r) -> dict:
    d = dict(r)
    d["config"] = json.loads(d["config"]) if d.get("config") else {}
    return d


def _source_type_to_camera(src_type: str, src_url: str) -> tuple[str, dict] | None:
    if src_type == "webcam":
        return ("usb", {"cameraType": "usb", "usbDevice": src_url})
    if src_type in {"url", "rtsp"}:
        return ("rtsp", {"cameraType": "rtsp", "rtspUrl": src_url})
    if src_type in {"mp4", "file"}:
        return ("video_file", {"cameraType": "video_file", "videoFile": src_url})
    return None


# ── cameras ───────────────────────────────────────────────────────────────────
@router.get("/cameras")
def get_cameras():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM cameras ORDER BY id DESC").fetchall() or []
    return [_cam_row(r) for r in rows]


@router.get("/cameras/{camera_id}")
def get_camera(camera_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Camera not found")
    return _cam_row(row)


@router.post("/cameras")
def create_camera(data: dict):
    camera_type = data.get("camera_type")
    if not camera_type:
        raise HTTPException(400, "camera_type is required")
    name        = data.get("name") or ""
    config_json = json.dumps(data.get("config", {}))
    with get_conn() as conn:
        first = conn.execute("SELECT COUNT(*) FROM cameras").fetchone()[0] == 0
        cur   = conn.execute(
            "INSERT INTO cameras (name, camera_type, config, is_active) VALUES (?, ?, ?, ?)",
            (name, camera_type, config_json, 1 if first else 0),
        )
        new_id = int(cur.lastrowid or 0)
        upsert_video_source(conn, new_id, name, camera_type, data.get("config", {}), 1 if first else 0)
    return {"id": new_id, "message": "Camera created successfully"}


@router.put("/cameras/{camera_id}")
def update_camera(camera_id: int, data: dict):
    camera_type = data.get("camera_type")
    if not camera_type:
        raise HTTPException(400, "camera_type is required")
    name        = data.get("name") or ""
    config_json = json.dumps(data.get("config", {}))
    with get_conn() as conn:
        conn.execute(
            "UPDATE cameras SET name=?, camera_type=?, config=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (name, camera_type, config_json, camera_id),
        )
        row    = conn.execute("SELECT is_active FROM cameras WHERE id=?", (camera_id,)).fetchone()
        active = int(row["is_active"]) if row else 0
        upsert_video_source(conn, camera_id, name, camera_type, data.get("config", {}), active)
    return {"message": "Camera updated successfully"}


@router.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM cameras WHERE id=?", (camera_id,))
        conn.execute("DELETE FROM video_sources WHERE camera_id=?", (camera_id,))
    return {"message": "Camera deleted successfully"}


@router.post("/cameras/{camera_id}/activate")
def activate_camera(camera_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, camera_type, config FROM cameras WHERE id=?", (camera_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Camera not found")
        config  = json.loads(row["config"]) if row["config"] else {}
        payload = switch_payload(row["camera_type"], config)
        if not payload:
            raise HTTPException(400, "Invalid camera config")
        src_type, src_url = payload

    ok = switch_capture(src_type, src_url, camera_id)
    if not ok:
        raise HTTPException(400, "Camera stream could not be opened")

    with get_conn() as conn:
        conn.execute("UPDATE cameras SET is_active=0 WHERE is_active=1")
        conn.execute("UPDATE cameras SET is_active=1 WHERE id=?", (camera_id,))
        conn.execute("UPDATE video_sources SET active=0")
        upsert_video_source(conn, camera_id, row["name"], row["camera_type"], config, 1)

    load_zones(camera_id)
    notify_zones_changed()
    return {"ok": True, "camera_id": camera_id, "simulation": False}


# ── sources ───────────────────────────────────────────────────────────────────
@router.get("/sources")
def get_sources():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM video_sources").fetchall() or []
    return [dict(r) for r in rows]


@router.post("/sources")
def create_source(data: dict):
    with get_conn() as conn:
        camera_id = data.get("camera_id")
        if camera_id is None:
            result = _source_type_to_camera(data["type"], data["url"])
            if result:
                cam_type, cam_cfg = result
                cur = conn.execute(
                    "INSERT INTO cameras (name, camera_type, config, is_active) VALUES (?, ?, ?, 0)",
                    (data["name"], cam_type, json.dumps(cam_cfg)),
                )
                camera_id = int(cur.lastrowid or 0)
        conn.execute(
            "INSERT INTO video_sources (name, type, url, camera_id) VALUES (?, ?, ?, ?)",
            (data["name"], data["type"], data["url"], camera_id),
        )
    return {"ok": True}


@router.delete("/sources/{source_id}")
def delete_source(source_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM video_sources WHERE id=?", (source_id,))
    return {"ok": True}


@router.post("/sources/{source_id}/activate")
def activate_source(source_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT type, url, camera_id FROM video_sources WHERE id=?", (source_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Source not found")

    ok = switch_capture(row["type"], row["url"], row["camera_id"])
    if not ok:
        raise HTTPException(400, "Video source could not be opened")

    with get_conn() as conn:
        conn.execute("UPDATE video_sources SET active=0")
        conn.execute("UPDATE video_sources SET active=1 WHERE id=?", (source_id,))
        if row["camera_id"] is not None:
            conn.execute("UPDATE cameras SET is_active=0 WHERE is_active=1")
            conn.execute("UPDATE cameras SET is_active=1 WHERE id=?", (row["camera_id"],))

    load_zones(row["camera_id"])
    notify_zones_changed()
    return {"ok": True, "simulation": False}


# ── quick switch ──────────────────────────────────────────────────────────────
@router.post("/webcam")
def switch_webcam(data: dict):
    ok = switch_capture("webcam", str(data["index"]))
    load_zones()
    notify_zones_changed()
    return {"ok": ok, "simulation": not ok}


@router.post("/connect")
def connect_url(data: dict):
    ok = switch_capture("url", data["url"])
    load_zones()
    notify_zones_changed()
    return {"ok": ok, "simulation": not ok}


@router.post("/source/activate")
def activate_external_source(data: dict):
    source_type = data.get("type")
    source_url = data.get("url")
    camera_id = data.get("camera_id")
    if not source_type:
        raise HTTPException(400, "type is required")
    if source_type != "webcam" and not source_url:
        raise HTTPException(400, "url is required")

    ok = switch_capture(source_type, str(source_url or "0"), camera_id)
    if not ok:
        raise HTTPException(400, "Video source could not be opened")

    load_zones(camera_id)
    notify_zones_changed()
    return {"ok": True, "simulation": False}


@router.post("/camera/activate-config")
def activate_camera_config(data: dict):
    camera_id = data.get("camera_id")
    camera_type = data.get("camera_type")
    config = data.get("config") or {}
    if camera_id is None:
        raise HTTPException(400, "camera_id is required")
    if not camera_type:
        raise HTTPException(400, "camera_type is required")

    payload = switch_payload(camera_type, config)
    if not payload:
        raise HTTPException(400, "Invalid camera config")

    src_type, src_url = payload
    ok = switch_capture(src_type, src_url, camera_id)
    if not ok:
        raise HTTPException(400, "Camera stream could not be opened")

    load_zones(int(camera_id))
    notify_zones_changed()
    return {"ok": True, "camera_id": int(camera_id), "simulation": False}


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    filename = file.filename or f"upload_{int(time.time())}.mp4"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    ok = switch_capture("mp4", str(dest))
    return {"ok": ok, "path": str(dest)}


@router.post("/camera/pause")
def pause_camera():
    with S.frame_lock:
        frame = S.latest_frame
    if not frame:
        raise HTTPException(404, "No camera frame available to pause")
    with S.pause_lock:
        S.paused_frame = frame
        S.capture_paused = True
    return {"ok": True, "paused": True}


@router.post("/camera/resume")
def resume_camera():
    with S.pause_lock:
        S.capture_paused = False
        S.paused_frame = None
    return {"ok": True, "paused": False}


@router.get("/camera/snapshot")
def camera_snapshot():
    with S.pause_lock:
        paused = S.capture_paused
        paused_frame = S.paused_frame
    if paused and paused_frame:
        return Response(content=paused_frame, media_type="image/jpeg")

    with S.frame_lock:
        frame = S.latest_frame
    if not frame:
        raise HTTPException(404, "No camera frame available")
    return Response(content=frame, media_type="image/jpeg")
