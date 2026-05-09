"""
main.py — SmartPat backend entry point.
Only: app init, lifespan, middleware, static mount, router includes.
"""

import asyncio
import threading
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import jwt as jose_jwt, JWTError

import services.state as S
from services.auth import init_db as init_auth_db
from services.camera import init_camera
from services.db import activate_saved_source, init_db, seed_env_camera
from services.detector import detection_loop
from services.parking import init_parking_db
from services.zones import load_zones

from routers import auth, cameras, parking, websockets, zones

SECRET_KEY = "smartpat-secret-key-change-in-prod"
ALGORITHM  = "HS256"


def _get_user_id_from_token(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _main_loop
    S._main_loop = asyncio.get_running_loop()
    init_auth_db()
    init_db()
    init_parking_db()
    seed_env_camera()
    load_zones()
    if not activate_saved_source():
        S.cap = init_camera()
    threading.Thread(target=detection_loop, daemon=True).start()
    yield
    with S.cap_lock:
        if S.cap:
            S.cap.release()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(cameras.router)
app.include_router(parking.router)
app.include_router(websockets.router)


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