"""
main.py — TechSentinel SmartPat backend.
Camera, detection, zones, and WebSocket streaming only.
Auth and parking sessions are handled by Supabase.
"""

import asyncio
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import services.state as S
from services.auth import init_db as init_auth_db
from services.db import init_db, seed_env_camera
from services.zones import load_zones

from routers import auth, cameras, parking, root, websockets, zones


def _camera_and_detect():
    from services.camera import init_camera
    from services.db import activate_saved_source
    from services.detector import detection_loop

    with S.cap_lock:
        if not activate_saved_source():
            S.cap = init_camera()

    detection_loop()


@asynccontextmanager
async def lifespan(app: FastAPI):
    S._main_loop = asyncio.get_running_loop()

    init_auth_db()
    init_db()
    seed_env_camera()
    load_zones()

    threading.Thread(target=_camera_and_detect, daemon=True).start()
    print("\nTechSentinel SmartPat backend running - http://127.0.0.1:8000\n")
    yield

    with S.cap_lock:
        if S.cap:
            S.cap.release()
        S.cap = None


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("uploads").mkdir(exist_ok=True)
Path("static").mkdir(exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
app.mount("/static",  StaticFiles(directory="static"),  name="static")

app.include_router(root.router)
app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(cameras.router)
app.include_router(websockets.router)
app.include_router(parking.router)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/camera/status")
def camera_status():
    import time
    with S.cap_lock:
        opened = bool(S.cap and S.cap.isOpened())
    with S.frame_lock:
        has_frame = S.latest_frame is not None
        age_s     = (time.monotonic() - S.last_frame_ts) if S.last_frame_ts else None
    with S.source_lock:
        source = dict(S.current_source)
    connected = (not S.simulation_mode) and opened and has_frame and (age_s is None or age_s <= 3.0)
    return {
        "connected":         connected,
        "simulation_mode":   S.simulation_mode,
        "opened":            opened,
        "has_frame":         has_frame,
        "frame_age_seconds": round(age_s, 3) if age_s is not None else None,
        "source":            source,
    }
