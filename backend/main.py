import cv2
import time
import os
import torch
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

app = FastAPI()

# ---------------- CORS (allow React dev server) ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- FRONTEND ----------------
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def home():
    return {"open": "http://localhost:8000/static/index.html"}

# ---------------- SPEED OPTIMIZATION ----------------
device = "cuda" if torch.cuda.is_available() else "cpu"

model = YOLO("yolov8n.pt")
model.to(device)
model.fuse()
model.overrides["verbose"] = False

tracker = DeepSort(max_age=30)

UPLOAD_PATH = "uploads/video.mp4"
cap = None


def load_video(path):
    global cap
    if cap:
        cap.release()
    cap = cv2.VideoCapture(path)


if os.path.exists("parking_space.mp4"):
    load_video("parking_space.mp4")


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)

    with open(UPLOAD_PATH, "wb") as f:
        f.write(await file.read())

    load_video(UPLOAD_PATH)

    return {"status": "ok"}


def reset():
    if cap:
        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)


# ---------------- STREAM ----------------
def generate():
    global cap

    while True:
        if cap is None:
            time.sleep(0.1)
            continue

        ret, frame = cap.read()

        if not ret:
            reset()
            continue

        start = time.time()

        results = model.predict(
            frame,
            imgsz=480,
            conf=0.4,
            device=device,
            verbose=False
        )[0]

        detections = []

        for box in results.boxes:
            cls = int(box.cls[0])

            if cls in [2, 3, 5, 7]:  # car, motorcycle, bus, truck
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                detections.append(([x1, y1, x2 - x1, y2 - y1], conf, "vehicle"))

        tracks = tracker.update_tracks(detections, frame=frame)

        count = 0

        for t in tracks:
            if not t.is_confirmed():
                continue

            track_id = t.track_id
            l, t_, r, b = t.to_ltrb()
            l, t_, r, b = map(int, [l, t_, r, b])
            count += 1

            cv2.rectangle(frame, (l, t_), (r, b), (0, 255, 0), 2)
            cv2.putText(frame, f"ID {track_id}", (l, t_ - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        fps = 1 / max(time.time() - start, 0.001)

        cv2.putText(frame, f"Tracked Vehicles: {count}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        cv2.putText(frame, f"FPS: {fps:.1f}", (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        _, buffer = cv2.imencode(".jpg", frame)

        yield (b"--frame\r\n"
               b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n")


@app.get("/video")
def video():
    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )
