"""
main.py — Parking/CCTV detection backend
FastAPI + YOLO + DeepSort + RTSP/USB/simulation
"""

import asyncio
import datetime
import json
import os
import shutil
import threading
import time
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from deep_sort_realtime.deepsort_tracker import DeepSort
from ultralytics import YOLO  # pyright: ignore[reportPrivateImportUsage]

from services.auth import get_conn, init_db as init_auth_db, login, register
from services.config import RTSP_TRANSPORT, get_env_rtsp_seed
from services.parking import init_parking_db

load_dotenv()

# ──────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ──────────────────────────────────────────────────────────────────────────────
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

VEHICLE_CLASSES      = {2, 3, 5, 7}   # car, motorcycle, bus, truck (COCO)
RATE_PER_MIN         = 1.5
PROCESS_EVERY_N      = 5              # run AI every N frames
VIDEO_FPS_CAP        = 0.033          # ~30 fps for WS video stream

# RTSP timeouts — critical for cheap/unreliable cameras
RTSP_OPEN_TIMEOUT_MS  = 8_000         # raised to 8 s (cheap cams are slow to respond)
RTSP_READ_TIMEOUT_MS  = 8_000
RTSP_THREAD_TIMEOUT_S = 10            # hard wall-clock cap for open attempt
RTSP_MAX_RECONNECT_S  = 60            # exponential backoff ceiling

# Simulation mode — black frame with "NO CAMERA" text
SIM_FRAME_W, SIM_FRAME_H = 1280, 720


# ──────────────────────────────────────────────────────────────────────────────
# AI MODELS  (loaded once at module level)
# ──────────────────────────────────────────────────────────────────────────────
model   = YOLO("yolov8n.pt")
tracker = DeepSort(max_age=20)


# ──────────────────────────────────────────────────────────────────────────────
# GLOBAL STATE
# ──────────────────────────────────────────────────────────────────────────────
cap:          cv2.VideoCapture | None = None
cap_lock      = threading.Lock()

latest_frame: bytes | None = None
frame_lock    = threading.Lock()
last_frame_ts = 0.0

current_source: dict[str, int | str | None] = {
    "type": None, "url": None, "camera_id": None
}
source_lock = threading.Lock()

zones_cache: list[dict] = []
zones_lock  = threading.Lock()

zone_ws_clients:  set[WebSocket] = set()
zone_ws_lock      = threading.Lock()

video_ws_clients: set[WebSocket] = set()
video_ws_lock     = threading.Lock()

_main_loop: asyncio.AbstractEventLoop | None = None

# Simulation mode flag — set True when no camera is available
simulation_mode = False


# ──────────────────────────────────────────────────────────────────────────────
# SIMULATION FRAME GENERATOR
# ──────────────────────────────────────────────────────────────────────────────
def _make_sim_frame() -> bytes:
    """Return a JPEG bytes of a black frame with a 'NO CAMERA' overlay."""
    frame = np.zeros((SIM_FRAME_H, SIM_FRAME_W, 3), dtype=np.uint8)
    ts    = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for text, y, scale in [
        ("NO CAMERA", SIM_FRAME_H // 2 - 30, 2.0),
        ("Simulation Mode", SIM_FRAME_H // 2 + 20, 0.8),
        (ts, SIM_FRAME_H - 20, 0.6),
    ]:
        cv2.putText(
            frame, text,
            (SIM_FRAME_W // 2 - int(len(text) * scale * 8), y),
            cv2.FONT_HERSHEY_SIMPLEX, scale, (80, 80, 80), 2, cv2.LINE_AA,
        )

    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
    return buf.tobytes()


# ──────────────────────────────────────────────────────────────────────────────
# RTSP HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def _open_rtsp(url: str) -> cv2.VideoCapture | None:
    """
    Open RTSP / any URL with a hard wall-clock timeout.

    Cheap IP cameras often:
      - Take 5-8 s to respond on first connect
      - Use non-standard RTSP paths (try_paths below)
      - Require explicit FFMPEG backend (avoids GStreamer fallback hanging)

    Returns None on failure — never raises.
    """
    result: list[cv2.VideoCapture | None] = [None]

    def _try():
        if url.lower().startswith("rtsp://"):
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{RTSP_TRANSPORT}"
        c = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
        c.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, RTSP_OPEN_TIMEOUT_MS)
        c.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC,  RTSP_READ_TIMEOUT_MS)
        # Ask for lower res from the camera itself — helps cheap cams stay stable
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)        # keep buffer tiny → low latency
        if c.isOpened():
            # Confirm we can actually grab a frame (some cams open but deliver nothing)
            ret, _ = c.read()
            if ret:
                result[0] = c
                return
        c.release()

    t = threading.Thread(target=_try, daemon=True)
    t.start()
    t.join(timeout=RTSP_THREAD_TIMEOUT_S)

    if t.is_alive():
        print(f"[RTSP] Open timed out after {RTSP_THREAD_TIMEOUT_S}s: {url}")
        return None

    if result[0] is None:
        print(f"[RTSP] Failed to open or read frame: {url}")

    return result[0]


def _try_rtsp_paths(base_url: str) -> cv2.VideoCapture | None:
    """
    Attempt common RTSP path suffixes that cheap cameras use.
    Tries the given URL first, then common fallbacks.
    """
    # If user provided a full URL, try it first
    cap = _open_rtsp(base_url)
    if cap:
        return cap

    # Common cheap-camera RTSP path variants
    COMMON_PATHS = [
        "/stream1", "/stream2", "/h264", "/live",
        "/live/ch00_0", "/live/ch01_0",
        "/ch01.264", "/ch001.264",
        "/cam/realmonitor?channel=1&subtype=0",
        "/user=admin&password=&channel=1&stream=0.sdp",
        "/11", "/12", "/1",
    ]
    # Extract scheme + host from base URL to build variants
    # e.g. rtsp://192.168.1.64:554 → try rtsp://192.168.1.64:554/stream1 etc.
    base = base_url.rstrip("/")
    if base.count("/") >= 3:
        # Already has a path — don't speculate further
        return None

    for path in COMMON_PATHS:
        url = base + path
        print(f"[RTSP] Trying fallback path: {url}")
        c = _open_rtsp(url)
        if c:
            print(f"[RTSP] Connected via: {url}")
            return c

    return None


# ──────────────────────────────────────────────────────────────────────────────
# CAMERA CONFIG HELPERS
# ──────────────────────────────────────────────────────────────────────────────
def _url_from_config(config: dict) -> str | None:
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


def _switch_payload(camera_type: str, config: dict) -> tuple[str, str] | None:
    """Return (source_type, source_url) from camera_type + config dict."""
    if camera_type == "usb":
        index = int((config.get("usbDevice") or "0").replace("/dev/video", "") or "0")
        return ("webcam", str(index))
    if camera_type == "video_file":
        url = _url_from_config(config)
        return ("mp4", url) if url else None
    url = _url_from_config(config)
    return ("rtsp", url) if url else None


def _upsert_video_source(conn, camera_id: int, name: str, camera_type: str,
                          config: dict, active: int) -> None:
    payload = _switch_payload(camera_type, config)
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


# ──────────────────────────────────────────────────────────────────────────────
# CAMERA INITIALIZATION
# ──────────────────────────────────────────────────────────────────────────────
def _set_source(src_type: str, url: str, camera_id=None):
    with source_lock:
        current_source["type"]      = src_type
        current_source["url"]       = url
        current_source["camera_id"] = camera_id


def init_camera() -> cv2.VideoCapture | None:
    global simulation_mode
    for idx in range(4):
        c = cv2.VideoCapture(idx)
        if c.isOpened():
            ret, frame = c.read()
            if ret and frame is not None:
                print(f"[Camera] USB camera {idx} OK")
                _set_source("webcam", str(idx))
                simulation_mode = False
                return c
        c.release()
    print("[Camera] No camera — simulation mode")
    simulation_mode = True
    _set_source("simulation", "none")
    return None


# ──────────────────────────────────────────────────────────────────────────────
# CAPTURE SWITCHING  (called from API endpoints)
# ──────────────────────────────────────────────────────────────────────────────
def _open_capture_for_source(source_type: str, url: str) -> cv2.VideoCapture | None:
    if source_type == "webcam":
        c = cv2.VideoCapture(int(url))
        if c.isOpened():
            ret, frame = c.read()
            if ret and frame is not None:
                return c
        c.release()
        return None

    if source_type in {"mp4", "file", "video_file"}:
        c = cv2.VideoCapture(url)
        if c.isOpened():
            ret, frame = c.read()
            if ret and frame is not None:
                c.set(cv2.CAP_PROP_POS_FRAMES, 0)
                return c
        c.release()
        return None

    return _try_rtsp_paths(url)


def _switch_capture(source_type: str, url: str, camera_id=None) -> bool:
    """
    Swap the live capture. Returns True on success.
    Keeps the previous capture alive if the new source fails to open.
    """
    global cap, simulation_mode

    with cap_lock, source_lock:
        if (
            cap
            and cap.isOpened()
            and current_source["type"] == source_type
            and current_source["url"] == url
        ):
            current_source["camera_id"] = camera_id
            simulation_mode = False
            return True

    new_cap = _open_capture_for_source(source_type, url)
    ok      = new_cap is not None

    with cap_lock:
        if ok:
            if cap:
                cap.release()
            cap = new_cap
            simulation_mode = False
            _set_source(source_type, url, camera_id)
        else:
            if new_cap:
                new_cap.release()
            if cap is None:
                simulation_mode = True
                _set_source("simulation", "none")
            print(f"[Switch] Failed to open {url}")

    return ok


# ──────────────────────────────────────────────────────────────────────────────
# DB INIT + MIGRATIONS
# ──────────────────────────────────────────────────────────────────────────────
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
        # Safe migrations
        for table, col, defn in [
            ("zones",         "zone_type",  "TEXT DEFAULT 'parking'"),
            ("zones",         "occupied",   "INTEGER DEFAULT 0"),
            ("zones",         "entry_time", "TEXT"),
            ("video_sources", "camera_id",  "INTEGER"),
            ("parking_sessions", "plate",   "TEXT DEFAULT 'UNKNOWN'"),
        ]:
            _safe_add_column(conn, table, col, defn)


def _safe_add_column(conn, table: str, column: str, col_def: str):
    existing = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in existing:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")
        print(f"[DB] Migrated: added '{column}' to '{table}'")


def _seed_env_camera() -> None:
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
        _upsert_video_source(conn, camera_id, name, "rtsp", config, active)


def _activate_saved_source() -> bool:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, camera_type, config FROM cameras WHERE is_active=1 ORDER BY updated_at DESC, id DESC LIMIT 1"
        ).fetchone()
    if not row:
        return False

    config = json.loads(row["config"]) if row["config"] else {}
    payload = _switch_payload(row["camera_type"], config)
    if not payload:
        return False

    src_type, src_url = payload
    return _switch_capture(src_type, src_url, int(row["id"]))


# ──────────────────────────────────────────────────────────────────────────────
# ZONE CACHE
# ──────────────────────────────────────────────────────────────────────────────
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
    with zones_lock:
        zones_cache.clear()
        zones_cache.extend(cache)


# ──────────────────────────────────────────────────────────────────────────────
# WS BROADCAST HELPERS
# ──────────────────────────────────────────────────────────────────────────────
async def broadcast_zones():
    with zones_lock:
        payload = json.dumps(zones_cache)
    with zone_ws_lock:
        dead = {ws for ws in zone_ws_clients if not await _safe_send_text(ws, payload)}
        zone_ws_clients.difference_update(dead)


async def _safe_send_text(ws: WebSocket, data: str) -> bool:
    try:
        await ws.send_text(data)
        return True
    except Exception:
        return False


def _notify_zones_changed():
    if zone_ws_clients:
        _schedule(broadcast_zones())


async def broadcast_video(frame: bytes):
    with video_ws_lock:
        dead = set()
        for ws in video_ws_clients:
            try:
                await ws.send_bytes(frame)
            except Exception:
                dead.add(ws)
        video_ws_clients.difference_update(dead)


def _schedule(coro):
    """Thread-safe: schedule an async coroutine on the main event loop."""
    if _main_loop and not _main_loop.is_closed():
        asyncio.run_coroutine_threadsafe(coro, _main_loop)


# ──────────────────────────────────────────────────────────────────────────────
# LIFESPAN
# ──────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop, cap
    _main_loop = asyncio.get_running_loop()
    init_auth_db()
    init_db()
    init_parking_db()
    _seed_env_camera()
    load_zones()
    if not _activate_saved_source():
        cap = init_camera()
    threading.Thread(target=_detection_loop, daemon=True).start()
    yield
    with cap_lock:
        if cap:
            cap.release()


# ──────────────────────────────────────────────────────────────────────────────
# APP
# ──────────────────────────────────────────────────────────────────────────────
app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# POLYGON HELPER
# ──────────────────────────────────────────────────────────────────────────────
def _point_in_polygon(x: float, y: float, poly: list) -> bool:
    inside = False
    n      = len(poly)
    p1x, p1y = poly[0]
    for i in range(1, n + 1):
        p2x, p2y = poly[i % n]
        if min(p1y, p2y) < y <= max(p1y, p2y) and x <= max(p1x, p2x):
            if p1y != p2y:
                xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                if p1x == p2x or x <= xinters:
                    inside = not inside
        p1x, p1y = p2x, p2y
    return inside


# ──────────────────────────────────────────────────────────────────────────────
# DETECTION LOOP
# ──────────────────────────────────────────────────────────────────────────────
def _detection_loop():
    global latest_frame, cap, last_frame_ts, simulation_mode

    consecutive_failures = 0
    reconnect_attempts   = 0
    frame_skip           = 0
    last_video_ts        = 0.0

    while True:
        # ── Simulation mode: emit synthetic frames, skip detection ────────────
        if simulation_mode:
            now = time.monotonic()
            if (now - last_video_ts) >= VIDEO_FPS_CAP:
                frame_bytes = _make_sim_frame()
                with frame_lock:
                    latest_frame  = frame_bytes
                    last_frame_ts = now
                if video_ws_clients:
                    _schedule(broadcast_video(frame_bytes))
                last_video_ts = now
            time.sleep(0.1)
            continue

        # ── No cap yet: try to reconnect with exponential backoff ─────────────
        if cap is None:
            wait = min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S)
            print(f"[Loop] No camera — retry in {wait}s (attempt {reconnect_attempts + 1})")
            time.sleep(wait)
            with cap_lock:
                cap = init_camera()
            if cap is None:
                reconnect_attempts += 1
            else:
                reconnect_attempts = 0
            continue

        # ── Grab frame ────────────────────────────────────────────────────────
        with cap_lock:
            ret, frame = cap.read()

        if not ret or frame is None:
            with source_lock:
                active_type = current_source["type"]
            if active_type in {"mp4", "file", "video_file"}:
                with cap_lock:
                    if cap:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.03)
                continue
            consecutive_failures += 1
            if consecutive_failures >= 10:
                print("[Loop] Too many failures — reconnecting...")
                with cap_lock:
                    if cap:
                        cap.release()
                    cap = init_camera()
                consecutive_failures = 0
                if cap is None:
                    reconnect_attempts += 1
                    time.sleep(min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S))
            time.sleep(0.1)
            continue

        consecutive_failures = 0
        reconnect_attempts   = 0

        # ── Video broadcast (rate-limited) ────────────────────────────────────
        now = time.monotonic()
        if (now - last_video_ts) >= VIDEO_FPS_CAP:
            _, buf      = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_bytes = buf.tobytes()
            with frame_lock:
                latest_frame  = frame_bytes
                last_frame_ts = now
            if video_ws_clients:
                _schedule(broadcast_video(frame_bytes))
            last_video_ts = now

        # ── AI detection (every N frames) ─────────────────────────────────────
        frame_skip = (frame_skip + 1) % PROCESS_EVERY_N
        if frame_skip != 0:
            time.sleep(0.01)
            continue

        results    = model.predict(frame, verbose=False)[0]
        detections = []
        for b in (results.boxes or []):
            if int(b.cls[0]) not in VEHICLE_CLASSES:
                continue
            x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
            detections.append(([x1, y1, x2 - x1, y2 - y1], float(b.conf[0]), "car"))

        tracks  = tracker.update_tracks(detections, frame=frame)
        centers = [
            (
                (t.to_ltrb()[0] + t.to_ltrb()[2]) / 2,
                (t.to_ltrb()[1] + t.to_ltrb()[3]) / 2,
            )
            for t in tracks if t.is_confirmed()
        ]

        _process_zones(centers, frame.shape)

        time.sleep(0.03)


def _zone_points_for_frame(points: list, frame_shape) -> list:
    if not points:
        return []
    h, w = frame_shape[:2]
    normalized = all(
        isinstance(p, (list, tuple))
        and len(p) >= 2
        and 0 <= float(p[0]) <= 1
        and 0 <= float(p[1]) <= 1
        for p in points
    )
    if normalized:
        return [[float(x) * w, float(y) * h] for x, y in points]
    return points


def _process_zones(centers: list[tuple[float, float]], frame_shape):
    """Update zone occupancy and log parking sessions."""
    now_iso = datetime.datetime.now().isoformat()

    with zones_lock:
        snapshot = list(zones_cache)

    db_updates:    list[tuple] = []
    sessions:      list[tuple[str, str]] = []
    cache_updates: dict[int, dict] = {}

    for z in snapshot:
        zone_points = _zone_points_for_frame(z["points"], frame_shape)
        if len(zone_points) < 3:
            continue
        in_zone  = any(_point_in_polygon(cx, cy, zone_points) for cx, cy in centers)
        is_park  = z["zone_type"] == "parking"
        new_occ  = in_zone if is_park else False

        if not is_park and in_zone and not z["occupied"]:
            verb = "entered" if z["zone_type"] == "entry" else "exited"
            print(f"[Zone] Vehicle {verb} via {z['slot']}")

        if new_occ == bool(z["occupied"]):
            continue

        if new_occ:
            db_updates.append((1, now_iso, z["id"]))
            cache_updates[z["id"]] = {"occupied": True, "entry_time": now_iso}
        else:
            if z["entry_time"]:
                sessions.append((z["slot"], z["entry_time"]))
            db_updates.append((0, None, z["id"]))
            cache_updates[z["id"]] = {"occupied": False, "entry_time": None}

    if not db_updates:
        return

    with get_conn() as conn:
        for new_occ, entry_time, zone_id in db_updates:
            if new_occ:
                conn.execute(
                    "UPDATE zones SET occupied=1, entry_time=? WHERE id=?",
                    (entry_time, zone_id),
                )
            else:
                conn.execute(
                    "UPDATE zones SET occupied=0, entry_time=NULL WHERE id=?",
                    (zone_id,),
                )
        for slot, entry_time in sessions:
            entry_dt = datetime.datetime.fromisoformat(entry_time)
            duration = max(1, int((datetime.datetime.now() - entry_dt).total_seconds() / 60))
            bill     = round(duration * RATE_PER_MIN, 2)
            conn.execute(
                "INSERT INTO parking_sessions (slot, plate, entry, exit, duration_min, bill) VALUES (?, ?, ?, ?, ?, ?)",
                (slot, "UNKNOWN", entry_time, now_iso, duration, bill),
            )

    with zones_lock:
        for z in zones_cache:
            if z["id"] in cache_updates:
                z.update(cache_updates[z["id"]])

    if zone_ws_clients:
        _schedule(broadcast_zones())


# ──────────────────────────────────────────────────────────────────────────────
# AUTH API
# ──────────────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@app.post("/auth/login")
def auth_login(req: LoginRequest):
    try:
        return login(req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

@app.post("/auth/register")
def auth_register(req: RegisterRequest):
    try:
        return register(req.name, req.email, req.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# ZONES API
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/zones")
def get_zones():
    with zones_lock:
        return list(zones_cache)

@app.post("/zones")
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
    _notify_zones_changed()
    return {"ok": True, "id": zone_id}

@app.put("/zones/{zone_id}")
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
    _notify_zones_changed()
    return {"ok": True}

@app.delete("/zones/{zone_id}")
def delete_zone(zone_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM zones WHERE id=?", (zone_id,))
    load_zones()
    _notify_zones_changed()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# CAMERAS API
# ──────────────────────────────────────────────────────────────────────────────
def _cam_row(r) -> dict:
    d = dict(r)
    d["config"] = json.loads(d["config"]) if d.get("config") else {}
    return d

@app.get("/cameras")
def get_cameras():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM cameras ORDER BY id DESC").fetchall() or []
    return [_cam_row(r) for r in rows]

@app.get("/cameras/{camera_id}")
def get_camera(camera_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM cameras WHERE id=?", (camera_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Camera not found")
    return _cam_row(row)

@app.post("/cameras")
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
        _upsert_video_source(conn, new_id, name, camera_type, data.get("config", {}), 1 if first else 0)
    return {"id": new_id, "message": "Camera created successfully"}

@app.put("/cameras/{camera_id}")
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
        _upsert_video_source(conn, camera_id, name, camera_type, data.get("config", {}), active)
    return {"message": "Camera updated successfully"}

@app.delete("/cameras/{camera_id}")
def delete_camera(camera_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM cameras WHERE id=?", (camera_id,))
        conn.execute("DELETE FROM video_sources WHERE camera_id=?", (camera_id,))
    return {"message": "Camera deleted successfully"}

@app.post("/cameras/{camera_id}/activate")
def activate_camera(camera_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name, camera_type, config FROM cameras WHERE id=?", (camera_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Camera not found")
        config  = json.loads(row["config"]) if row["config"] else {}
        payload = _switch_payload(row["camera_type"], config)
        if not payload:
            raise HTTPException(400, "Invalid camera config")
        src_type, src_url = payload

    ok = _switch_capture(src_type, src_url, camera_id)
    if not ok:
        raise HTTPException(400, "Camera stream could not be opened")

    with get_conn() as conn:
        conn.execute("UPDATE cameras SET is_active=0 WHERE is_active=1")
        conn.execute("UPDATE cameras SET is_active=1 WHERE id=?", (camera_id,))
        conn.execute("UPDATE video_sources SET active=0")
        _upsert_video_source(conn, camera_id, row["name"], row["camera_type"], config, 1)

    return {"ok": True, "camera_id": camera_id, "simulation": False}


# ──────────────────────────────────────────────────────────────────────────────
# VIDEO SOURCES API
# ──────────────────────────────────────────────────────────────────────────────
def _source_type_to_camera(src_type: str, src_url: str) -> tuple[str, dict] | None:
    if src_type == "webcam":
        return ("usb", {"cameraType": "usb", "usbDevice": src_url})
    if src_type in {"url", "rtsp"}:
        return ("rtsp", {"cameraType": "rtsp", "rtspUrl": src_url})
    if src_type in {"mp4", "file"}:
        return ("video_file", {"cameraType": "video_file", "videoFile": src_url})
    return None

@app.get("/sources")
def get_sources():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM video_sources").fetchall() or []
    return [dict(r) for r in rows]

@app.post("/sources")
def create_source(data: dict):
    with get_conn() as conn:
        camera_id = data.get("camera_id")
        if camera_id is None:
            result = _source_type_to_camera(data["type"], data["url"])
            if result:
                cam_type, cam_cfg = result
                cur       = conn.execute(
                    "INSERT INTO cameras (name, camera_type, config, is_active) VALUES (?, ?, ?, 0)",
                    (data["name"], cam_type, json.dumps(cam_cfg)),
                )
                camera_id = int(cur.lastrowid or 0)
        conn.execute(
            "INSERT INTO video_sources (name, type, url, camera_id) VALUES (?, ?, ?, ?)",
            (data["name"], data["type"], data["url"], camera_id),
        )
    return {"ok": True}

@app.delete("/sources/{source_id}")
def delete_source(source_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM video_sources WHERE id=?", (source_id,))
    return {"ok": True}

@app.post("/sources/{source_id}/activate")
def activate_source(source_id: int):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT type, url, camera_id FROM video_sources WHERE id=?", (source_id,)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Source not found")

    ok = _switch_capture(row["type"], row["url"], row["camera_id"])
    if not ok:
        raise HTTPException(400, "Video source could not be opened")

    with get_conn() as conn:
        conn.execute("UPDATE video_sources SET active=0")
        conn.execute("UPDATE video_sources SET active=1 WHERE id=?", (source_id,))
        if row["camera_id"] is not None:
            conn.execute("UPDATE cameras SET is_active=0 WHERE is_active=1")
            conn.execute("UPDATE cameras SET is_active=1 WHERE id=?", (row["camera_id"],))

    return {"ok": True, "simulation": False}


# ──────────────────────────────────────────────────────────────────────────────
# CAMERA QUICK-SWITCH ENDPOINTS
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/camera/status")
def camera_status():
    with cap_lock:
        opened = bool(cap and cap.isOpened())
    with frame_lock:
        has_frame = latest_frame is not None
        age_s     = (time.monotonic() - last_frame_ts) if last_frame_ts else None
    with source_lock:
        source = dict(current_source)
    connected = (not simulation_mode) and opened and has_frame and (age_s is None or age_s <= 3.0)
    return {
        "connected":        connected,
        "simulation_mode":  simulation_mode,
        "opened":           opened,
        "has_frame":        has_frame,
        "frame_age_seconds": round(age_s, 3) if age_s is not None else None,
        "source":           source,
    }

@app.post("/webcam")
def switch_webcam(data: dict):
    ok = _switch_capture("webcam", str(data["index"]))
    return {"ok": ok, "simulation": not ok}

@app.post("/connect")
def connect_url(data: dict):
    ok = _switch_capture("url", data["url"])
    return {"ok": ok, "simulation": not ok}

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    filename = file.filename or f"upload_{int(time.time())}.mp4"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    ok = _switch_capture("mp4", str(dest))
    return {"ok": ok, "path": str(dest)}


# ──────────────────────────────────────────────────────────────────────────────
# SESSIONS / STATS API
# ──────────────────────────────────────────────────────────────────────────────
def _range_start(range_: str) -> str:
    now = datetime.datetime.now()
    if range_ == "today":
        return now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    if range_ == "week":
        return (now - datetime.timedelta(days=7)).isoformat()
    if range_ == "month":
        return (now - datetime.timedelta(days=30)).isoformat()
    return "1970-01-01T00:00:00"

@app.get("/sessions")
def get_sessions():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM parking_sessions ORDER BY id DESC LIMIT 200"
        ).fetchall() or []
    return [dict(r) for r in rows]

@app.get("/parking/sessions")
def parking_sessions(range: str = "today"):
    since = _range_start(range)
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM parking_sessions WHERE entry >= ? ORDER BY id DESC LIMIT 500",
            (since,),
        ).fetchall() or []
    return [dict(r) for r in rows]

@app.get("/parking/stats")
def parking_stats(range: str = "today"):
    since = _range_start(range)
    with get_conn() as conn:
        row = conn.execute(
            """SELECT
                COUNT(*)                        AS total_sessions,
                COALESCE(SUM(duration_min), 0)  AS total_minutes,
                COALESCE(SUM(bill), 0)          AS total_revenue,
                COALESCE(AVG(duration_min), 0)  AS avg_duration_min
               FROM parking_sessions WHERE entry >= ?""",
            (since,),
        ).fetchone()
        occupied    = conn.execute("SELECT COUNT(*) FROM zones WHERE occupied=1").fetchone()[0]
        total_zones = conn.execute("SELECT COUNT(*) FROM zones").fetchone()[0]
    total_sessions = row["total_sessions"]
    total_revenue = round(row["total_revenue"], 2)
    avg_duration = round(row["avg_duration_min"], 1)
    return {
        "total_sessions":    total_sessions,
        "total_minutes":     round(row["total_minutes"], 1),
        "total_revenue":     total_revenue,
        "avg_duration_min":  avg_duration,
        "occupied_now":      occupied,
        "free_now":          max(0, total_zones - occupied),
        "total_zones":       total_zones,
        "totalSessions":     total_sessions,
        "totalRevenue":      total_revenue,
        "avgDuration":       avg_duration,
        "avgCharge":         round(total_revenue / total_sessions, 2) if total_sessions else 0,
        "occupancyCurrent":  occupied,
        "occupancyTotal":    total_zones,
        "vehicleTurnover":   total_sessions // total_zones if total_zones else 0,
    }


@app.get("/parking/slots")
def parking_slots():
    with get_conn() as conn:
        zone_rows = conn.execute(
            "SELECT id, slot, occupied, entry_time FROM zones WHERE zone_type='parking' ORDER BY slot"
        ).fetchall() or []
        if zone_rows:
            return [
                {
                    "id":     r["id"],
                    "slot":   r["slot"],
                    "status": "occupied" if r["occupied"] else "available",
                    "plate":  None,
                    "since":  r["entry_time"],
                }
                for r in zone_rows
            ]

        rows = conn.execute(
            "SELECT id, slot, status, plate, since FROM parking_slots ORDER BY slot"
        ).fetchall() or []
    return [dict(r) for r in rows]


def _analytics_window(days: int) -> tuple[str, str]:
    end = datetime.datetime.now()
    start = end - datetime.timedelta(days=days)
    return start.isoformat(), end.isoformat()


@app.get("/analytics/stats")
def analytics_stats():
    week_start, now = _analytics_window(7)
    prev_start = (datetime.datetime.fromisoformat(week_start) - datetime.timedelta(days=7)).isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT entry, bill FROM parking_sessions ORDER BY entry"
        ).fetchall() or []
        peak = conn.execute(
            """SELECT strftime('%H', entry) AS hour, COUNT(*) AS n
               FROM parking_sessions
               WHERE entry IS NOT NULL
               GROUP BY hour
               ORDER BY n DESC, hour ASC
               LIMIT 1"""
        ).fetchone()
        current = conn.execute(
            "SELECT COALESCE(SUM(bill), 0) FROM parking_sessions WHERE entry >= ? AND entry <= ?",
            (week_start, now),
        ).fetchone()[0]
        previous = conn.execute(
            "SELECT COALESCE(SUM(bill), 0) FROM parking_sessions WHERE entry >= ? AND entry < ?",
            (prev_start, week_start),
        ).fetchone()[0]

    total_revenue = sum(float(r["bill"] or 0) for r in rows)
    billed_rows = [r for r in rows if r["bill"] is not None]
    dates = {str(r["entry"])[:10] for r in rows if r["entry"]}
    avg_daily = total_revenue / max(1, len(dates))
    avg_session = total_revenue / max(1, len(billed_rows))
    if previous:
        growth = round(((current - previous) / previous) * 100, 1)
    else:
        growth = 100.0 if current else 0.0

    return {
        "totalRevenue":      round(total_revenue, 2),
        "totalVehicles":     len(rows),
        "avgDailyRevenue":   round(avg_daily, 2),
        "avgSessionBill":    round(avg_session, 2),
        "peakHour":          f"{peak['hour']}:00" if peak and peak["hour"] is not None else "N/A",
        "revenueGrowthPct":  growth,
    }


@app.get("/analytics/revenue")
def analytics_revenue():
    since, _ = _analytics_window(30)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COALESCE(SUM(bill), 0) AS revenue
               FROM parking_sessions
               WHERE entry >= ?
               GROUP BY date(entry)
               ORDER BY date(entry)""",
            (since,),
        ).fetchall() or []
    return [{"date": r["date"], "revenue": round(r["revenue"], 2)} for r in rows]


@app.get("/analytics/vehicles")
def analytics_vehicles():
    since, _ = _analytics_window(30)
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COUNT(*) AS vehicles
               FROM parking_sessions
               WHERE entry >= ?
               GROUP BY date(entry)
               ORDER BY date(entry)""",
            (since,),
        ).fetchall() or []
    return [{"date": r["date"], "vehicles": r["vehicles"]} for r in rows]


@app.get("/analytics/activity")
def analytics_activity():
    today = datetime.date.today()
    labels = [(today - datetime.timedelta(days=i)) for i in range(6, -1, -1)]
    counts = {d.isoformat(): 0 for d in labels}
    since = labels[0].isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT date(entry) AS date, COUNT(*) AS vehicles
               FROM parking_sessions
               WHERE entry >= ?
               GROUP BY date(entry)""",
            (since,),
        ).fetchall() or []
    for r in rows:
        if r["date"] in counts:
            counts[r["date"]] = r["vehicles"]
    return [
        {"label": d.strftime("%a"), "vehicles": counts[d.isoformat()]}
        for d in labels
    ]


# ──────────────────────────────────────────────────────────────────────────────
# WEBSOCKETS
# ──────────────────────────────────────────────────────────────────────────────
@app.websocket("/ws/zones")
async def ws_zones(ws: WebSocket):
    await ws.accept()
    with zone_ws_lock:
        zone_ws_clients.add(ws)
    try:
        with zones_lock:
            await ws.send_text(json.dumps(zones_cache))
        while True:
            await ws.receive_text()   # keep connection open; ping/pong handled by client
    except WebSocketDisconnect:
        pass
    finally:
        with zone_ws_lock:
            zone_ws_clients.discard(ws)


@app.websocket("/ws/video")
async def ws_video(ws: WebSocket):
    await ws.accept()
    with video_ws_lock:
        video_ws_clients.add(ws)
    # Send the latest cached frame immediately so the client isn't blank on connect
    with frame_lock:
        if latest_frame:
            try:
                await ws.send_bytes(latest_frame)
            except Exception:
                pass
    try:
        while True:
            try:
                await asyncio.sleep(60)
            except asyncio.CancelledError:
                break
    except WebSocketDisconnect:
        pass
    finally:
        with video_ws_lock:
            video_ws_clients.discard(ws)


# ──────────────────────────────────────────────────────────────────────────────
# MJPEG FALLBACK
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/video")
def video_mjpeg():
    def gen():
        while True:
            with frame_lock:
                frame = latest_frame
            if frame:
                yield (
                    b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                    + frame
                    + b"\r\n"
                )
            time.sleep(0.033)

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")
