import cv2
import re
import time
import os
import threading
import subprocess
import torch
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

from services.auth import init_db, register, login
from services.camera_stream import CameraStream
from services.config import RTSP_URLS as _CONFIGURED_RTSP_URLS

init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── serve built React app if dist/ exists ─────────────────────────────────────
DIST = Path(__file__).parent.parent / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

# ── model ────────────────────────────────────────────────────────────────────
device = "cuda" if torch.cuda.is_available() else "cpu"
model = YOLO("yolov8n.pt")
model.to(device)
model.fuse()
if device == "cuda":
    model.half()                          # FP16 only on GPU
model.overrides["verbose"] = False

INFER_SIZE   = 320    # small = fast on potato laptop
JPEG_QUALITY = 65     # lower = smaller payload = smoother stream
SKIP_FRAMES  = 2      # run YOLO every Nth frame; draw cached boxes in between
TARGET_FPS   = 20     # stream cap

# ── tracker ──────────────────────────────────────────────────────────────────
def make_tracker():
    return DeepSort(max_age=20, n_init=2, nn_budget=50, embedder_gpu=device == "cuda")

tracker = make_tracker()

# ── shared state (inference thread → stream thread) ──────────────────────────
latest_frame: bytes | None = None
frame_lock    = threading.Lock()
cap_lock      = threading.Lock()
cap: cv2.VideoCapture | None = None
camera_stream: CameraStream | None = None
_running      = False
_loop_source  = False   # True only for uploaded MP4 files


def open_source(source):
    """Switch capture source: webcam index, file path, or RTSP/HTTP URL."""
    global cap, camera_stream, tracker, _running, _loop_source

    is_url = isinstance(source, str) and any(
        source.startswith(p) for p in ("rtsp://", "rtmp://", "http://", "https://")
    )

    tracker = make_tracker()

    if is_url:
        # Use CameraStream for proper RTSP transport negotiation + reconnection
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
        # Webcam index or local file — use raw VideoCapture
        with cap_lock:
            if camera_stream:
                camera_stream.close()
                camera_stream = None
            if cap:
                cap.release()
            new_cap = cv2.VideoCapture(source)
            new_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if source == 0:
                new_cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
                new_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                new_cap.set(cv2.CAP_PROP_FPS,          30)
            cap = new_cap
        _loop_source = isinstance(source, str)   # True for file paths

    if not _running:
        _running = True
        t = threading.Thread(target=_inference_loop, daemon=True)
        t.start()


def _inference_loop():
    """Background thread: read frames, run YOLO+DeepSORT, encode JPEG."""
    global latest_frame

    frame_idx  = 0
    last_boxes: list = []    # cached (ltrb, track_id) from last YOLO run

    while True:
        with cap_lock:
            if camera_stream is not None:
                # RTSP path — CameraStream always returns a frame (real or fallback)
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

        # ── resize display frame to max 640 wide ──────────────────────────
        h, w = frame.shape[:2]
        if w > 640:
            scale = 640 / w
            frame = cv2.resize(frame, (640, int(h * scale)))

        frame_idx += 1

        # ── YOLO inference every SKIP_FRAMES ──────────────────────────────
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
                if cls not in [2, 3, 5, 7]:   # car, motorcycle, bus, truck
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x1, y1, x2, y2 = int(x1*sx), int(y1*sy), int(x2*sx), int(y2*sy)
                dets.append(([x1, y1, x2-x1, y2-y1], float(box.conf[0]), "vehicle"))

            tracks   = tracker.update_tracks(dets, frame=frame)
            last_boxes = [
                (list(map(int, t.to_ltrb())), t.track_id)
                for t in tracks if t.is_confirmed()
            ]

        # ── draw cached boxes (every frame) ───────────────────────────────
        for (l, top, r, b), tid in last_boxes:
            cv2.rectangle(frame, (l, top), (r, b), (0, 255, 0), 2)
            cv2.putText(frame, f"#{tid}", (l, top - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        count = len(last_boxes)
        cv2.putText(frame, f"Vehicles: {count}", (10, 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        _, buf = cv2.imencode(
            ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
        )

        with frame_lock:
            latest_frame = buf.tobytes()


# ── start with webcam on launch ───────────────────────────────────────────────
open_source(_CONFIGURED_RTSP_URLS[0] if _CONFIGURED_RTSP_URLS else 0)


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
    try:
        return register(body.name, body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login")
def auth_login(body: LoginBody):
    try:
        return login(body.email, body.password)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ── endpoints ─────────────────────────────────────────────────────────────────
class SourceRequest(BaseModel):
    url: str


class WebcamRequest(BaseModel):
    index: int = 0


def _v4l2_devices() -> dict[int, str]:
    """
    Parse `v4l2-ctl --list-devices` into {video_index: human_name}.
    Returns only the first (capture) node per physical device to avoid duplicates.
    Example output line: "Logitech BRIO (usb-0000:00:14.0-5):"
    """
    try:
        out = subprocess.run(
            ["v4l2-ctl", "--list-devices"],
            capture_output=True, text=True, timeout=3
        ).stdout
        devices: dict[int, str] = {}
        current_name: str | None = None
        for line in out.splitlines():
            stripped = line.strip()
            if not stripped:
                continue
            if not line.startswith(("\t", " ")):
                # strip the "(usb-xxx):" part to get the clean device name
                current_name = re.sub(r"\s*\(.*\):?$", "", line).strip()
            elif stripped.startswith("/dev/video"):
                idx = int(stripped.removeprefix("/dev/video"))
                if current_name and idx not in devices:   # keep first node only
                    devices[idx] = current_name
        return devices
    except Exception:
        return {}


@app.get("/cameras")
def list_cameras():
    """Return openable cameras with real device names."""
    v4l2 = _v4l2_devices()
    seen_names: set[str] = set()
    cameras = []

    for i in range(8):
        cap = cv2.VideoCapture(i)
        if not cap.isOpened():
            cap.release()
            continue

        # prefer v4l2 name → sysfs name → fallback
        name = v4l2.get(i)
        if not name:
            try:
                with open(f"/sys/class/video4linux/video{i}/name") as f:
                    name = f.read().strip()
            except Exception:
                name = f"Camera {i}"

        cap.release()

        # skip duplicate physical devices (e.g. video0 and video1 same camera)
        if name in seen_names:
            continue
        seen_names.add(name)
        cameras.append({"index": i, "name": name})

    return cameras


@app.post("/connect")
def connect_source(body: SourceRequest):
    """Connect to any CCTV/IP camera URL (rtsp://, http://, etc.)."""
    open_source(body.url)
    return {"status": "ok"}


@app.post("/webcam")
def use_webcam(body: WebcamRequest = WebcamRequest()):
    """Switch to webcam by index (default 0)."""
    open_source(body.index)
    return {"status": "ok"}


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    path = "uploads/video.mp4"
    with open(path, "wb") as f:
        f.write(await file.read())
    open_source(path)
    return {"status": "ok"}


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


@app.get("/video")
def video():
    return StreamingResponse(
        _stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ── SPA fallback — must be last ───────────────────────────────────────────────
@app.get("/")
@app.get("/{full_path:path}")
def serve_spa(full_path: str = ""):
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"status": "backend running", "ui": "run `npm run build` in the project root"}
