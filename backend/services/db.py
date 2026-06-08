"""
services/db.py
DB init for zones, cameras, video_sources only.
Parking sessions and users are now handled by Supabase.
"""

import json
from datetime import datetime, timedelta

from services.auth import get_conn
from services.config import get_env_rtsp_seed


def _safe_add_column(conn, table: str, column: str, col_def: str):
    existing = conn.execute(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?
        """,
        (table, column),
    ).fetchone()
    if not existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        print(f"[DB] Migrated: added '{column}' to '{table}'")


def _safe_add_index(conn, table: str, index_name: str, index_def: str):
    existing = conn.execute(
        """
        SELECT INDEX_NAME
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?
        LIMIT 1
        """,
        (table, index_name),
    ).fetchone()
    if not existing:
        conn.execute(f"ALTER TABLE {table} ADD INDEX {index_name} {index_def}")
        print(f"[DB] Migrated: added index '{index_name}' to '{table}'")


def _drop_slot_only_unique_indexes(conn):
    indexes = conn.execute(
        """
        SELECT
            INDEX_NAME,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_csv,
            MAX(NON_UNIQUE) AS non_unique
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'zones'
          AND INDEX_NAME <> 'PRIMARY'
        GROUP BY INDEX_NAME
        """
    ).fetchall() or []
    for idx in indexes:
        if int(idx["non_unique"]) == 0 and idx["columns_csv"] == "slot":
            conn.execute(f"ALTER TABLE zones DROP INDEX `{idx['INDEX_NAME']}`")
            print(f"[DB] Migrated: dropped slot-only unique index '{idx['INDEX_NAME']}'")


def _assign_legacy_zones_to_active_camera(conn):
    has_legacy = conn.execute(
        "SELECT 1 FROM zones WHERE camera_id IS NULL LIMIT 1"
    ).fetchone()
    if not has_legacy:
        return

    camera = conn.execute(
        """
        SELECT id FROM cameras
        ORDER BY is_active DESC, updated_at DESC, id DESC
        LIMIT 1
        """
    ).fetchone()
    if not camera:
        return

    conn.execute(
        "UPDATE zones SET camera_id=? WHERE camera_id IS NULL",
        (camera["id"],),
    )
    print(f"[DB] Migrated: assigned legacy zones to camera {camera['id']}")


def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS zones (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                camera_id  INT NULL,
                slot       VARCHAR(64) NOT NULL,
                points     TEXT,
                zone_type  VARCHAR(32) DEFAULT 'parking',
                occupied   TINYINT DEFAULT 0,
                entry_time DATETIME NULL,
                INDEX idx_zones_camera_id (camera_id)
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS video_sources (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                name      VARCHAR(255) NOT NULL,
                type      VARCHAR(64) NOT NULL,
                url       TEXT NOT NULL,
                active    TINYINT DEFAULT 0,
                camera_id INT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cameras (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                name        VARCHAR(255),
                camera_type VARCHAR(64) NOT NULL,
                config      TEXT,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                is_active   TINYINT DEFAULT 1
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS parking_sessions (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                slot         VARCHAR(64) NOT NULL,
                plate        VARCHAR(64) NOT NULL,
                entry        DATETIME NOT NULL,
                `exit`       DATETIME NULL,
                duration_min INT NULL,
                bill         DECIMAL(10,2) NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_parking_sessions_entry (entry),
                INDEX idx_parking_sessions_slot (slot)
            )
        """)
        for table, col, defn in [
            ("zones",         "zone_type",  "VARCHAR(32) DEFAULT 'parking'"),
            ("zones",         "occupied",   "TINYINT DEFAULT 0"),
            ("zones",         "entry_time", "DATETIME NULL"),
            ("zones",         "camera_id",  "INT NULL"),
            ("video_sources", "camera_id",  "INT NULL"),
        ]:
            _safe_add_column(conn, table, col, defn)
        _drop_slot_only_unique_indexes(conn)
        _safe_add_index(conn, "zones", "idx_zones_camera_id", "(camera_id)")
        _assign_legacy_zones_to_active_camera(conn)
        _seed_parking_sessions(conn)


def _seed_parking_sessions(conn):
    if conn.execute("SELECT COUNT(*) AS count FROM parking_sessions").fetchone()[0] > 0:
        return

    now = datetime.now().replace(second=0, microsecond=0)

    def row(slot: str, plate: str, days: int, hour: int, minute: int, duration: int):
        entry = (now - timedelta(days=days)).replace(hour=hour, minute=minute)
        exit_time = entry + timedelta(minutes=duration)
        return (slot, plate, entry, exit_time, duration, round(duration * 1.5, 2))

    samples = [
        row("A1", "ABC 1234", 0, 8, 10, 55),
        row("A2", "XYZ 5678", 0, 9, 20, 40),
        row("B1", "DEF 9012", 0, 10, 15, 75),
        row("B2", "GHI 3456", 1, 7, 45, 60),
        row("A3", "JKL 7890", 1, 13, 20, 90),
        row("C1", "MNO 1122", 2, 8, 30, 120),
        row("C2", "PQR 3344", 3, 11, 10, 45),
        row("A1", "STU 5566", 4, 14, 0, 70),
        row("B3", "VWX 7788", 5, 16, 25, 85),
        row("A2", "YZA 8989", 6, 9, 5, 50),
        row("C3", "BCD 1010", 10, 12, 15, 110),
        row("B1", "EFG 2020", 15, 15, 45, 95),
        row("A4", "HIJ 3030", 22, 8, 5, 65),
        row("B4", "KLM 4040", 29, 17, 0, 120),
    ]

    conn.executemany(
        """
        INSERT INTO parking_sessions (slot, plate, entry, `exit`, duration_min, bill)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        samples,
    )


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