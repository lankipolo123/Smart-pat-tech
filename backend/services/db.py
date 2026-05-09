"""
services/db.py
DB init, migrations, seeding, and camera config helpers.
"""

import json

from services.auth import get_conn
from services.config import get_env_rtsp_seed


def _safe_add_column(conn, table: str, column: str, col_def: str):
    existing = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        print(f"[DB] Migrated: added '{column}' to '{table}'")


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS zones (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                slot       TEXT UNIQUE,
                points     TEXT,
                zone_type  TEXT DEFAULT 'parking',
                occupied   INTEGER DEFAULT 0,
                entry_time TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parking_sessions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                slot         TEXT,
                plate        TEXT NOT NULL DEFAULT 'UNKNOWN',
                entry        TEXT,
                exit         TEXT,
                duration_min INTEGER,
                bill         REAL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS video_sources (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                name      TEXT NOT NULL,
                type      TEXT NOT NULL,
                url       TEXT NOT NULL,
                active    INTEGER DEFAULT 0,
                camera_id INTEGER
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cameras (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT,
                camera_type TEXT NOT NULL,
                config      TEXT,
                created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at  TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active   INTEGER DEFAULT 1
            )
        """)
        for table, col, defn in [
            ("zones",            "zone_type",  "TEXT DEFAULT 'parking'"),
            ("zones",            "occupied",   "INTEGER DEFAULT 0"),
            ("zones",            "entry_time", "TEXT"),
            ("video_sources",    "camera_id",  "INTEGER"),
            ("parking_sessions", "plate",      "TEXT DEFAULT 'UNKNOWN'"),
        ]:
            _safe_add_column(conn, table, col, defn)


# ── camera config helpers ─────────────────────────────────────────────────────
def url_from_config(config: dict) -> str | None:
    cam_type = config.get("cameraType")
    if cam_type == "rtsp" and config.get("rtspUrl"):
        return config["rtspUrl"]
    if cam_type == "ip_camera" and config.get("cameraIp"):
        user     = config.get("rtspUser", "")
        password = config.get("rtspPassword", "")
        ip       = config["cameraIp"]
        port     = config.get("rtspPort", "554")
        path     = (config.get("rtspPaths") or "stream1").split(",")[0].strip()
        creds    = f"{user}:{password}@" if user else ""
        return f"rtsp://{creds}{ip}:{port}/{path}"
    if cam_type == "video_file" and config.get("videoFile"):
        return config["videoFile"]
    return None


def switch_payload(camera_type: str, config: dict) -> tuple[str, str] | None:
    if camera_type == "usb":
        index = int((config.get("usbDevice") or "0").replace("/dev/video", "") or "0")
        return ("webcam", str(index))
    if camera_type == "video_file":
        url = url_from_config(config)
        return ("mp4", url) if url else None
    url = url_from_config(config)
    return ("rtsp", url) if url else None


def upsert_video_source(conn, camera_id: int, name: str, camera_type: str,
                        config: dict, active: int) -> None:
    payload = switch_payload(camera_type, config)
    if not payload:
        return
    src_type, src_url = payload
    existing = conn.execute(
        "SELECT id FROM video_sources WHERE camera_id=?", (camera_id,)
    ).fetchone()
    if existing:
        conn.execute(
            "UPDATE video_sources SET name=?, type=?, url=?, active=? WHERE camera_id=?",
            (name or f"Camera {camera_id}", src_type, src_url, active, camera_id),
        )
    else:
        conn.execute(
            "INSERT INTO video_sources (name, type, url, active, camera_id) VALUES (?, ?, ?, ?, ?)",
            (name or f"Camera {camera_id}", src_type, src_url, active, camera_id),
        )


def seed_env_camera() -> None:
    config = get_env_rtsp_seed()
    if not config:
        return
    rtsp_url = config.get("rtspUrl")
    name     = config.get("cameraName") or "Environment RTSP"
    with get_conn() as conn:
        row = None
        for candidate in conn.execute("SELECT id, config FROM cameras").fetchall() or []:
            try:
                candidate_config = json.loads(candidate["config"] or "{}")
            except json.JSONDecodeError:
                continue
            if candidate_config.get("rtspUrl") == rtsp_url:
                row = candidate
                break
        has_active = conn.execute(
            "SELECT 1 FROM cameras WHERE is_active=1 LIMIT 1"
        ).fetchone() is not None
        active = 0 if has_active else 1
        if row:
            camera_id = int(row["id"])
            conn.execute(
                "UPDATE cameras SET name=?, camera_type='rtsp', config=?, is_active=CASE WHEN ?=1 THEN 1 ELSE is_active END, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                (name, json.dumps(config), active, camera_id),
            )
        else:
            cur = conn.execute(
                "INSERT INTO cameras (name, camera_type, config, is_active) VALUES (?, 'rtsp', ?, ?)",
                (name, json.dumps(config), active),
            )
            camera_id = int(cur.lastrowid or 0)
        upsert_video_source(conn, camera_id, name, "rtsp", config, active)


def activate_saved_source() -> bool:
    from services.camera import switch_capture
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, camera_type, config FROM cameras WHERE is_active=1 ORDER BY updated_at DESC, id DESC LIMIT 1"
        ).fetchone()
    if not row:
        return False
    config = json.loads(row["config"]) if row["config"] else {}
    payload = switch_payload(row["camera_type"], config)
    if not payload:
        return False
    src_type, src_url = payload
    return switch_capture(src_type, src_url, int(row["id"]))