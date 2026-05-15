"""
services/camera.py
All camera / capture logic: RTSP helpers, USB, simulation frame, switching.

Fixes applied:
  - _open_rtsp: cancelled flag prevents leaked VideoCapture when the open
    thread times out — previously the thread kept running and held a cap
    object that was never released, slowly exhausting file descriptors.
  - switch_capture: removed nested lock acquisition (cap_lock + source_lock
    together, then cap_lock alone calling set_source which re-takes
    source_lock). Now cap_lock and source_lock are always acquired separately
    and in a consistent order to prevent deadlock.
"""

import os
import threading
import time
import datetime

import cv2
import numpy as np

import services.state as S
from services.config import RTSP_TRANSPORT

# ── constants ─────────────────────────────────────────────────────────────────
RTSP_OPEN_TIMEOUT_MS  = 8_000
RTSP_READ_TIMEOUT_MS  = 8_000
RTSP_THREAD_TIMEOUT_S = 10
RTSP_MAX_RECONNECT_S  = 60
SIM_FRAME_W, SIM_FRAME_H = 1280, 720


# ── simulation ────────────────────────────────────────────────────────────────
def make_sim_frame() -> bytes:
    frame = np.zeros((SIM_FRAME_H, SIM_FRAME_W, 3), dtype=np.uint8)
    ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
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


# ── RTSP helpers ──────────────────────────────────────────────────────────────
def _open_rtsp(url: str) -> cv2.VideoCapture | None:
    result: list[cv2.VideoCapture | None] = [None]
    # FIX: cancelled flag signals the thread to release the cap if we already
    # timed out and moved on — previously the thread kept the cap object alive
    # indefinitely, leaking file descriptors on every failed reconnect attempt.
    cancelled = threading.Event()

    def _try():
        if url.lower().startswith("rtsp://"):
            os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = f"rtsp_transport;{RTSP_TRANSPORT}"
        c = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
        c.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, RTSP_OPEN_TIMEOUT_MS)
        c.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC,  RTSP_READ_TIMEOUT_MS)
        c.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if cancelled.is_set():
            c.release()
            return
        if c.isOpened():
            ret, _ = c.read()
            if ret and not cancelled.is_set():
                result[0] = c
                return
        c.release()

    t = threading.Thread(target=_try, daemon=True)
    t.start()
    t.join(timeout=RTSP_THREAD_TIMEOUT_S)
    if t.is_alive():
        cancelled.set()  # FIX: tell the thread to clean up when it finishes
        print(f"[RTSP] Open timed out after {RTSP_THREAD_TIMEOUT_S}s: {url}")
        return None
    if result[0] is None:
        print(f"[RTSP] Failed to open: {url}")
    return result[0]


def _try_rtsp_paths(base_url: str) -> cv2.VideoCapture | None:
    cap = _open_rtsp(base_url)
    if cap:
        return cap
    COMMON_PATHS = [
        "/stream1", "/stream2", "/h264", "/live",
        "/live/ch00_0", "/live/ch01_0",
        "/ch01.264", "/ch001.264",
        "/cam/realmonitor?channel=1&subtype=0",
        "/user=admin&password=&channel=1&stream=0.sdp",
        "/11", "/12", "/1",
    ]
    base = base_url.rstrip("/")
    if base.count("/") >= 3:
        return None
    for path in COMMON_PATHS:
        url = base + path
        print(f"[RTSP] Trying fallback: {url}")
        c = _open_rtsp(url)
        if c:
            print(f"[RTSP] Connected via: {url}")
            return c
    return None


# ── capture open ──────────────────────────────────────────────────────────────
def open_capture(source_type: str, url: str) -> cv2.VideoCapture | None:
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


# ── set source helper ─────────────────────────────────────────────────────────
def set_source(src_type: str, url: str, camera_id=None):
    # Always acquire source_lock alone — never call this while holding cap_lock
    with S.source_lock:
        S.current_source["type"]      = src_type
        S.current_source["url"]       = url
        S.current_source["camera_id"] = camera_id


# ── switch capture ────────────────────────────────────────────────────────────
def switch_capture(source_type: str, url: str, camera_id=None) -> bool:
    # FIX: original code acquired cap_lock + source_lock together in one block,
    # then later called set_source() (which acquires source_lock) while still
    # inside cap_lock — creating a lock-order inconsistency that can deadlock.
    # Now we always acquire the two locks separately and never nest them.

    # Check if already on this source (read both locks separately)
    with S.source_lock:
        already_same = (
            S.current_source["type"] == source_type
            and S.current_source["url"] == url
        )
    with S.cap_lock:
        cap_ok = bool(S.cap and S.cap.isOpened())

    if already_same and cap_ok:
        with S.source_lock:
            S.current_source["camera_id"] = camera_id
        S.simulation_mode = False
        return True

    # Open outside any lock — this can be slow (RTSP timeout etc.)
    new_cap = open_capture(source_type, url)
    ok = new_cap is not None

    # Update cap under cap_lock only
    cap_is_none = False  # default; updated inside lock when ok=False
    with S.cap_lock:
        if ok:
            if S.cap:
                S.cap.release()
            S.cap = new_cap
            S.simulation_mode = False
        else:
            if new_cap:
                new_cap.release()
            cap_is_none = S.cap is None

    # Update source under source_lock only (separate acquisition — no nesting)
    if ok:
        set_source(source_type, url, camera_id)
    else:
        if cap_is_none:
            S.simulation_mode = True
            set_source("simulation", "none", None)
        print(f"[Switch] Failed to open {url}")

    return ok


# ── init camera on startup ────────────────────────────────────────────────────
def init_camera() -> cv2.VideoCapture | None:
    for idx in range(4):
        c = cv2.VideoCapture(idx)
        if c.isOpened():
            ret, frame = c.read()
            if ret and frame is not None:
                print(f"[Camera] USB camera {idx} OK")
                set_source("webcam", str(idx))
                S.simulation_mode = False
                return c
        c.release()
    print("[Camera] No camera — simulation mode")
    S.simulation_mode = True
    set_source("simulation", "none")
    return None