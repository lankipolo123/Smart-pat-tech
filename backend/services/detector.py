"""
services/detector.py
YOLO + DeepSort detection loop and zone processing.
Parking session writes go to MySQL (fire-and-forget).
"""

import datetime
import json
import time
import logging

import cv2

from services.auth import get_conn
import services.state as S
from services.zones import broadcast_zones, schedule

log = logging.getLogger(__name__)

VEHICLE_CLASSES      = {2, 3, 5, 7}
RATE_PER_MIN         = 1.5
PROCESS_EVERY_N      = 5
VIDEO_FPS_CAP        = 0.033
RTSP_MAX_RECONNECT_S = 60
DB_TIMEOUT_S         = 5


# ── Supabase session insert (fire-and-forget, never blocks detection) ─────────
def _insert_session_mysql(slot: str, entry_time: str, exit_time: str,
                          duration: int, bill: float) -> None:
    """Runs in a separate daemon thread — never blocks the detection loop."""
    try:
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO parking_sessions (slot, plate, entry, exit, duration_min, bill)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (slot, "UNKNOWN", entry_time, exit_time, duration, bill),
            )
    except Exception as exc:
        log.error("[MySQL] Failed to insert parking session: %s", exc)


# ── polygon helper ────────────────────────────────────────────────────────────
def _point_in_polygon(x: float, y: float, poly: list) -> bool:
    inside = False
    n = len(poly)
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


def _normalize_box(x1: float, y1: float, x2: float, y2: float, frame_shape, label: str, confidence: float) -> dict:
    h, w = frame_shape[:2]
    x1 = max(0.0, min(float(w), x1))
    y1 = max(0.0, min(float(h), y1))
    x2 = max(0.0, min(float(w), x2))
    y2 = max(0.0, min(float(h), y2))
    return {
        "x": round(x1 / w, 4) if w else 0,
        "y": round(y1 / h, 4) if h else 0,
        "width": round(max(0.0, x2 - x1) / w, 4) if w else 0,
        "height": round(max(0.0, y2 - y1) / h, 4) if h else 0,
        "label": label,
        "confidence": round(confidence, 3),
    }


def _set_detections(boxes: list[dict]) -> None:
    with S.detections_lock:
        S.latest_detections = boxes
    with S.detection_ws_lock:
        has_clients = bool(S.detection_ws_clients)
    if has_clients:
        schedule(_broadcast_detections(boxes))


# ── zone processing ───────────────────────────────────────────────────────────
def _process_zones(centers: list[tuple[float, float]], frame_shape):
    import threading

    now_iso = datetime.datetime.now().isoformat()

    with S.zones_lock:
        snapshot = list(S.zones_cache)

    db_updates:    list[tuple] = []
    sessions:      list[tuple[str, str]] = []
    cache_updates: dict[int, dict] = {}

    for z in snapshot:
        zone_points = _zone_points_for_frame(z["points"], frame_shape)
        if len(zone_points) < 3:
            continue
        in_zone = any(_point_in_polygon(cx, cy, zone_points) for cx, cy in centers)
        is_park = z["zone_type"] == "parking"
        new_occ = in_zone if is_park else False

        if not is_park and in_zone and not z["occupied"]:
            verb = "entered" if z["zone_type"] == "entry" else "exited"
            log.info("[Zone] Vehicle %s via %s", verb, z["slot"])

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

    # ── Update zones table in local SQLite ───────────────────────────────────
    try:
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
    except Exception as exc:
        log.error("[Zone] DB write failed (skipping this update): %s", exc)
        return

    # ── Fire-and-forget session inserts to Supabase ──────────────────────────
    for slot, entry_time in sessions:
        entry_dt = datetime.datetime.fromisoformat(entry_time)
        duration = max(1, int((datetime.datetime.now() - entry_dt).total_seconds() / 60))
        bill     = round(duration * RATE_PER_MIN, 2)
        exit_iso = datetime.datetime.now().isoformat()
        threading.Thread(
            target=_insert_session_mysql,
            args=(slot, entry_time, exit_iso, duration, bill),
            daemon=True,
        ).start()

    # ── Update in-memory zones cache ─────────────────────────────────────────
    with S.zones_lock:
        for z in S.zones_cache:
            if z["id"] in cache_updates:
                z.update(cache_updates[z["id"]])

    with S.zone_ws_lock:
        has_zone_clients = bool(S.zone_ws_clients)
    if has_zone_clients:
        schedule(broadcast_zones())


# ── detection loop ────────────────────────────────────────────────────────────
def detection_loop():
    from ultralytics import YOLO  # pyright: ignore[reportPrivateImportUsage]
    from deep_sort_realtime.deepsort_tracker import DeepSort
    from services.camera import init_camera, make_sim_frame

    log.info("[Detector] Loading YOLO model...")
    model   = YOLO("yolov8n.pt")
    tracker = DeepSort(max_age=20)
    log.info("[Detector] Model ready.")

    consecutive_failures = 0
    reconnect_attempts   = 0
    frame_skip           = 0
    last_video_ts        = 0.0

    while True:

        # ── simulation mode ───────────────────────────────────────────────
        if S.simulation_mode:
            now = time.monotonic()
            if (now - last_video_ts) >= VIDEO_FPS_CAP:
                frame_bytes = make_sim_frame()
                with S.frame_lock:
                    S.latest_frame  = frame_bytes
                    S.last_frame_ts = now
                with S.video_ws_lock:
                    has_video_clients = bool(S.video_ws_clients)
                if has_video_clients:
                    schedule(_broadcast_video(frame_bytes))
                last_video_ts = now
            time.sleep(0.1)
            continue

        # ── check cap ─────────────────────────────────────────────────────
        with S.cap_lock:
            cap_is_none = S.cap is None

        if cap_is_none:
            wait = min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S)
            log.warning("[Loop] No camera — retry in %ss (attempt %d)", wait, reconnect_attempts + 1)
            time.sleep(wait)
            new_cap = init_camera()
            with S.cap_lock:
                S.cap = new_cap
            if new_cap is None:
                reconnect_attempts += 1
            else:
                reconnect_attempts = 0
            continue

        # ── read frame ────────────────────────────────────────────────────
        with S.cap_lock:
            cap_ref = S.cap

        if cap_ref is None:
            continue

        ret, frame = cap_ref.read()

        if not ret or frame is None:
            with S.source_lock:
                active_type = S.current_source.get("type")

            if active_type in {"mp4", "file", "video_file"}:
                with S.cap_lock:
                    if S.cap:
                        S.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.03)
                continue

            consecutive_failures += 1
            if consecutive_failures >= 10:
                log.warning("[Loop] Too many failures — reconnecting...")
                new_cap = init_camera()
                with S.cap_lock:
                    if S.cap:
                        S.cap.release()
                    S.cap = new_cap
                consecutive_failures = 0
                if new_cap is None:
                    reconnect_attempts += 1
                    time.sleep(min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S))
                else:
                    reconnect_attempts = 0
            time.sleep(0.1)
            continue

        consecutive_failures = 0
        reconnect_attempts   = 0

        with S.pause_lock:
            paused = S.capture_paused
            paused_frame = S.paused_frame

        if paused:
            now = time.monotonic()
            if paused_frame is None:
                try:
                    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
                    paused_frame = buf.tobytes()
                except Exception as exc:
                    log.error("[Loop] Failed to encode paused frame: %s", exc)
                    time.sleep(0.1)
                    continue
                with S.pause_lock:
                    S.paused_frame = paused_frame
            if (now - last_video_ts) >= VIDEO_FPS_CAP:
                with S.frame_lock:
                    S.latest_frame = paused_frame
                    S.last_frame_ts = now
                with S.video_ws_lock:
                    has_video_clients = bool(S.video_ws_clients)
                if has_video_clients:
                    schedule(_broadcast_video(paused_frame))
                last_video_ts = now
            time.sleep(0.03)
            continue

        # ── encode + broadcast video frame ────────────────────────────────
        now = time.monotonic()
        if (now - last_video_ts) >= VIDEO_FPS_CAP:
            try:
                _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                frame_bytes = buf.tobytes()
            except Exception as exc:
                log.error("[Loop] Failed to encode frame: %s", exc)
                time.sleep(0.1)
                continue
            with S.frame_lock:
                S.latest_frame  = frame_bytes
                S.last_frame_ts = now
            with S.video_ws_lock:
                has_video_clients = bool(S.video_ws_clients)
            if has_video_clients:
                schedule(_broadcast_video(frame_bytes))
            last_video_ts = now

        # ── YOLO + tracker ────────────────────────────────────────────────
        frame_skip = (frame_skip + 1) % PROCESS_EVERY_N
        if frame_skip != 0:
            time.sleep(0.01)
            continue

        try:
            results    = model.predict(frame, verbose=False)[0]
            detections = []
            detection_boxes = []
            for b in (results.boxes or []):
                if int(b.cls[0]) not in VEHICLE_CLASSES:
                    continue
                x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
                confidence = float(b.conf[0])
                detections.append(([x1, y1, x2 - x1, y2 - y1], confidence, "car"))
                detection_boxes.append(
                    _normalize_box(x1, y1, x2, y2, frame.shape, "vehicle", confidence)
                )

            tracks = tracker.update_tracks(detections, frame=frame)
            centers = [
                (
                    (t.to_ltrb()[0] + t.to_ltrb()[2]) / 2,
                    (t.to_ltrb()[1] + t.to_ltrb()[3]) / 2,
                )
                for t in tracks if t.is_confirmed()
            ]
            _set_detections(detection_boxes)
        except Exception as exc:
            log.error("[Loop] YOLO/tracker error (skipping frame): %s", exc)
            time.sleep(0.1)
            continue

        try:
            _process_zones(centers, frame.shape)
        except Exception as exc:
            log.error("[Loop] Zone processing error: %s", exc)

        time.sleep(0.03)


# ── video broadcast ───────────────────────────────────────────────────────────
async def _broadcast_video(frame: bytes):
    with S.video_ws_lock:
        clients = set(S.video_ws_clients)

    dead = set()
    for ws in clients:
        try:
            await ws.send_bytes(frame)
        except Exception:
            dead.add(ws)

    if dead:
        with S.video_ws_lock:
            S.video_ws_clients.difference_update(dead)


async def _broadcast_detections(boxes: list[dict]):
    payload = json.dumps(boxes)
    with S.detection_ws_lock:
        clients = set(S.detection_ws_clients)

    dead = set()
    for ws in clients:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.add(ws)

    if dead:
        with S.detection_ws_lock:
            S.detection_ws_clients.difference_update(dead)
