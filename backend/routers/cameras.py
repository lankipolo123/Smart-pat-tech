"""routers/cameras.py — /cameras, /sources, /webcam, /connect, /upload-video"""

import json
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from services.auth import get_conn
from services.camera import switch_capture
from services.db import switch_payload, upsert_video_source

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

    return {"ok": True, "simulation": False}


# ── quick switch ──────────────────────────────────────────────────────────────
@router.post("/webcam")
def switch_webcam(data: dict):
    ok = switch_capture("webcam", str(data["index"]))
    return {"ok": ok, "simulation": not ok}


@router.post("/connect")
def connect_url(data: dict):
    ok = switch_capture("url", data["url"])
    return {"ok": ok, "simulation": not ok}


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    filename = file.filename or f"upload_{int(time.time())}.mp4"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    ok = switch_capture("mp4", str(dest))
    return {"ok": ok, "path": str(dest)}