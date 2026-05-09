"""
services/detector.py
YOLO + DeepSort detection loop and zone processing.
"""

import datetime
import json
import time

import cv2
from deep_sort_realtime.deepsort_tracker import DeepSort
from ultralytics import YOLO  # pyright: ignore[reportPrivateImportUsage]

from services.auth import get_conn
import services.state as S
from services.zones import broadcast_zones, schedule

VEHICLE_CLASSES   = {2, 3, 5, 7}
RATE_PER_MIN      = 1.5
PROCESS_EVERY_N   = 5
VIDEO_FPS_CAP     = 0.033
RTSP_MAX_RECONNECT_S = 60

model   = YOLO("yolov8n.pt")
tracker = DeepSort(max_age=20)


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


# ── zone processing ───────────────────────────────────────────────────────────
def _process_zones(centers: list[tuple[float, float]], frame_shape):
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
            bill = round(duration * RATE_PER_MIN, 2)
            conn.execute(
                "INSERT INTO parking_sessions (slot, plate, entry, exit, duration_min, bill) VALUES (?, ?, ?, ?, ?, ?)",
                (slot, "UNKNOWN", entry_time, now_iso, duration, bill),
            )

    with S.zones_lock:
        for z in S.zones_cache:
            if z["id"] in cache_updates:
                z.update(cache_updates[z["id"]])

    if S.zone_ws_clients:
        schedule(broadcast_zones())


# ── detection loop ────────────────────────────────────────────────────────────
def detection_loop():
    from services.camera import init_camera, make_sim_frame

    consecutive_failures = 0
    reconnect_attempts   = 0
    frame_skip           = 0
    last_video_ts        = 0.0

    while True:
        if S.simulation_mode:
            now = time.monotonic()
            if (now - last_video_ts) >= VIDEO_FPS_CAP:
                frame_bytes = make_sim_frame()
                with S.frame_lock:
                    S.latest_frame  = frame_bytes
                    S.last_frame_ts = now
                if S.video_ws_clients:
                    schedule(_broadcast_video(frame_bytes))
                last_video_ts = now
            time.sleep(0.1)
            continue

        if S.cap is None:
            wait = min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S)
            print(f"[Loop] No camera — retry in {wait}s (attempt {reconnect_attempts + 1})")
            time.sleep(wait)
            with S.cap_lock:
                S.cap = init_camera()
            if S.cap is None:
                reconnect_attempts += 1
            else:
                reconnect_attempts = 0
            continue

        with S.cap_lock:
            ret, frame = S.cap.read()

        if not ret or frame is None:
            with S.source_lock:
                active_type = S.current_source["type"]
            if active_type in {"mp4", "file", "video_file"}:
                with S.cap_lock:
                    if S.cap:
                        S.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                time.sleep(0.03)
                continue
            consecutive_failures += 1
            if consecutive_failures >= 10:
                print("[Loop] Too many failures — reconnecting...")
                with S.cap_lock:
                    if S.cap:
                        S.cap.release()
                    S.cap = init_camera()
                consecutive_failures = 0
                if S.cap is None:
                    reconnect_attempts += 1
                    time.sleep(min(5 * (2 ** reconnect_attempts), RTSP_MAX_RECONNECT_S))
            time.sleep(0.1)
            continue

        consecutive_failures = 0
        reconnect_attempts   = 0

        now = time.monotonic()
        if (now - last_video_ts) >= VIDEO_FPS_CAP:
            _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_bytes = buf.tobytes()
            with S.frame_lock:
                S.latest_frame  = frame_bytes
                S.last_frame_ts = now
            if S.video_ws_clients:
                schedule(_broadcast_video(frame_bytes))
            last_video_ts = now

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

        tracks = tracker.update_tracks(detections, frame=frame)
        centers = [
            (
                (t.to_ltrb()[0] + t.to_ltrb()[2]) / 2,
                (t.to_ltrb()[1] + t.to_ltrb()[3]) / 2,
            )
            for t in tracks if t.is_confirmed()
        ]

        _process_zones(centers, frame.shape)
        time.sleep(0.03)


async def _broadcast_video(frame: bytes):
    with S.video_ws_lock:
        dead = set()
        for ws in S.video_ws_clients:
            try:
                await ws.send_bytes(frame)
            except Exception:
                dead.add(ws)
        S.video_ws_clients.difference_update(dead)