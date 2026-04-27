import cv2
import re
import time
import os
import threading
import asyncio
import torch
import jwt

from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

from services.auth import (
    init_db, register, login,
    update_avatar, get_avatar,
    SECRET_KEY, ALGORITHM
)
from services.camera_stream import CameraStream
from services.parking import (
    init_parking_db, get_slots, get_sessions, get_stats,
    get_analytics_stats, get_revenue_data, get_vehicle_data, get_activity_data,
)
from services.config import RTSP_URLS as _CONFIGURED_RTSP_URLS

init_db()
init_parking_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DIST = Path(__file__).parent.parent / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

AVATARS_DIR = Path(__file__).parent / "uploads" / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/avatars", StaticFiles(directory=AVATARS_DIR), name="avatars")

def _get_user_id(request: Request) -> int:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

device = "cuda" if torch.cuda.is_available() else "cpu"
model = YOLO("yolov8n.pt")
model.to(device)
model.fuse()
if device == "cuda":
    model.half()
model.overrides["verbose"] = False

INFER_SIZE   = 320
JPEG_QUALITY = 45
SKIP_FRAMES  = 4
TARGET_FPS   = 15

def make_tracker():
    return DeepSort(max_age=20, n_init=2, nn_budget=50, embedder_gpu=device == "cuda")

tracker = make_tracker()

latest_frame: bytes | None = None
frame_lock    = threading.Lock()
cap_lock      = threading.Lock()
cap: cv2.VideoCapture | None = None
camera_stream: CameraStream | None = None
_running      = False
_loop_source  = False

# WebSocket clients
ws_clients: set = set()
ws_clients_lock = threading.Lock()


def open_source(source):
    global cap, camera_stream, tracker, _running, _loop_source

    is_url = isinstance(source, str) and any(
        source.startswith(p) for p in ("rtsp://", "rtmp://", "http://", "https://")
    )

    tracker = make_tracker()

    if is_url:
        with cap_lock:
            if cap:
                cap.release()
                cap = None
            if camera_stream:
                camera_stream.close()
            camera_stream = CameraStream(rtsp_urls=[source])
            camera_stream.open()
        _loop_source = False
    else:
        with cap_lock:
            if camera_stream:
                camera_stream.close()
                camera_stream = None
            if cap:
                cap.release()
            new_cap = cv2.VideoCapture(source)
            new_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if source == 0:
                new_cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                new_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                new_cap.set(cv2.CAP_PROP_FPS, 30)
            cap = new_cap
        _loop_source = isinstance(source, str)

    if not _running:
        _running = True
        threading.Thread(target=_inference_loop, daemon=True).start()


def _inference_loop():
    global latest_frame

    frame_idx  = 0
    last_boxes: list = []

    while True:
        frame = None
        with cap_lock:
            if camera_stream is not None:
                frame = camera_stream.read()
            elif cap is None or not cap.isOpened():
                time.sleep(0.05)
                continue
            else:
                ret, frame = cap.read()
                if not ret:
                    if _loop_source:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    time.sleep(0.01)
                    continue

        if frame is None:
            time.sleep(0.05)
            continue

        h, w = frame.shape[:2]
        if w > 640:
            scale = 640 / w
            frame = cv2.resize(frame, (640, int(h * scale)))

        frame_idx += 1

        if frame_idx % SKIP_FRAMES == 0:
            ih, iw = frame.shape[:2]
            small  = cv2.resize(frame, (INFER_SIZE, int(ih * INFER_SIZE / iw)))

            results = model.predict(
                small, imgsz=INFER_SIZE, conf=0.45,
                device=device, verbose=False
            )[0]

            sx = iw / small.shape[1]
            sy = ih / small.shape[0]
            dets = []

            for box in results.boxes:
                cls = int(box.cls[0])
                if cls not in [2, 3, 5, 7]:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x1, y1, x2, y2 = int(x1*sx), int(y1*sy), int(x2*sx), int(y2*sy)
                dets.append(([x1, y1, x2-x1, y2-y1], float(box.conf[0]), "vehicle"))

            tracks = tracker.update_tracks(dets, frame=frame)
            last_boxes = [
                (list(map(int, t.to_ltrb())), t.track_id)
                for t in tracks if t.is_confirmed()
            ]

        for (l, top, r, b), tid in last_boxes:
            cv2.rectangle(frame, (l, top), (r, b), (0, 255, 0), 2)
            cv2.putText(frame, f"#{tid}", (l, top - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        count = len(last_boxes)
        cv2.putText(frame, f"Vehicles: {count}", (10, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])

        with frame_lock:
            latest_frame = buf.tobytes()


def _start_camera():
    source = _CONFIGURED_RTSP_URLS[0] if _CONFIGURED_RTSP_URLS else 0
    open_source(source)

threading.Thread(target=_start_camera, daemon=True).start()

# ── auth endpoints ────────────────────────────────────────────────────────────
class RegisterBody(BaseModel):
    name: str
    email: str
    password: str

class LoginBody(BaseModel):
    email: str
    password: str

@app.post("/auth/register")
def auth_register(body: RegisterBody):
    return register(body.name, body.email, body.password)

@app.post("/auth/login")
def auth_login(body: LoginBody):
    return login(body.email, body.password)

# ── avatar endpoints ──────────────────────────────────────────────────────────
@app.post("/user/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    user_id = _get_user_id(request)

    ext = Path(file.filename or "avatar.jpg").suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(status_code=400, detail="Invalid file type")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Max 5MB")

    filename = f"{user_id}{ext}"
    path = AVATARS_DIR / filename

    with open(path, "wb") as f:
        f.write(content)

    url = f"/avatars/{filename}"
    update_avatar(user_id, url)

    return {"avatar_url": url}


@app.get("/user/avatar")
def get_user_avatar(request: Request):
    user_id = _get_user_id(request)
    return {"avatar_url": get_avatar(user_id)}

# ── cameras endpoint ──────────────────────────────────────────────────────────
@app.get("/cameras")
def list_cameras():
    cameras = []
    for i, url in enumerate(_CONFIGURED_RTSP_URLS):
        cameras.append({"id": i, "url": url, "stream": f"/video?cam={i}"})
    if not cameras:
        cameras.append({"id": 0, "url": "webcam", "stream": "/video"})
    return cameras

# ── parking endpoints ─────────────────────────────────────────────────────────
@app.get("/parking/slots")
def parking_slots():
    return get_slots()

@app.get("/parking/sessions")
def parking_sessions(range: str = "today"):
    return get_sessions(range)

@app.get("/parking/stats")
def parking_stats(range: str = "today"):
    return get_stats(range)

# ── analytics endpoints ───────────────────────────────────────────────────────
@app.get("/analytics/stats")
def analytics_stats():
    return get_analytics_stats()

@app.get("/analytics/revenue")
def analytics_revenue():
    return get_revenue_data()

@app.get("/analytics/vehicles")
def analytics_vehicles():
    return get_vehicle_data()

@app.get("/analytics/activity")
def analytics_activity():
    return get_activity_data()

# ── video stream (MJPEG fallback) ────────────────────────────────────────────
@app.get("/video")
def video():
    return StreamingResponse(
        _stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

def _stream():
    interval = 1 / TARGET_FPS
    while True:
        with frame_lock:
            frame = latest_frame

        if frame is None:
            time.sleep(0.05)
            continue

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        )
        time.sleep(interval)

# ── WebSocket video stream ────────────────────────────────────────────────────
@app.websocket("/ws/video")
async def ws_video(websocket: WebSocket):
    await websocket.accept()
    with ws_clients_lock:
        ws_clients.add(websocket)

    interval = 1 / TARGET_FPS
    try:
        while True:
            with frame_lock:
                frame = latest_frame

            if frame is not None:
                await websocket.send_bytes(frame)

            await asyncio.sleep(interval)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        with ws_clients_lock:
            ws_clients.discard(websocket)