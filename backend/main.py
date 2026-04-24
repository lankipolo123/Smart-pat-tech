import cv2
import time
import os
import threading
import torch
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return {"open": "http://localhost:8000/static/index.html"}

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
_running      = False
_loop_source  = False   # True only for uploaded MP4 files


def open_source(source):
    """Switch capture source: 0=webcam, file path, or rtsp/http URL."""
    global cap, tracker, _running, _loop_source

    _loop_source = isinstance(source, str) and not any(
        source.startswith(p) for p in ("rtsp://", "rtmp://", "http://", "https://")
    )

    with cap_lock:
        if cap:
            cap.release()

        new_cap = cv2.VideoCapture(source)
        new_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # minimal latency

        if source == 0:                             # webcam tweaks
            new_cap.set(cv2.CAP_PROP_FRAME_WIDTH,  640)
            new_cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            new_cap.set(cv2.CAP_PROP_FPS,          30)

        cap = new_cap
        tracker = make_tracker()                   # fresh tracker on source switch

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
            if cap is None or not cap.isOpened():
                time.sleep(0.05)
                continue
            ret, frame = cap.read()

        if not ret:
            if _loop_source:
                with cap_lock:
                    if cap:
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)   # loop uploaded file
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
open_source(0)


# ── endpoints ─────────────────────────────────────────────────────────────────
class SourceRequest(BaseModel):
    url: str


class WebcamRequest(BaseModel):
    index: int = 0


def _camera_name(index: int) -> str:
    try:
        with open(f"/sys/class/video4linux/video{index}/name") as f:
            return f.read().strip()
    except Exception:
        return f"Camera {index}"


@app.get("/cameras")
def list_cameras():
    """Return all camera indices that can be opened."""
    cameras = []
    for i in range(8):
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            cameras.append({"index": i, "name": _camera_name(i)})
            cap.release()
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
