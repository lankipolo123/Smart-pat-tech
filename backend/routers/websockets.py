"""routers/websockets.py — /ws/zones, /ws/video, /video MJPEG"""

import asyncio
import json
import time

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

import services.state as S
from services.zones import broadcast_zones

router = APIRouter()


@router.websocket("/ws/zones")
async def ws_zones(ws: WebSocket):
    await ws.accept()
    with S.zone_ws_lock:
        S.zone_ws_clients.add(ws)
    try:
        with S.zones_lock:
            payload = json.dumps(S.zones_cache)
        await ws.send_text(payload)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        with S.zone_ws_lock:
            S.zone_ws_clients.discard(ws)


@router.websocket("/ws/video")
async def ws_video(ws: WebSocket):
    await ws.accept()
    with S.video_ws_lock:
        S.video_ws_clients.add(ws)
    with S.frame_lock:
        if S.latest_frame:
            try:
                await ws.send_bytes(S.latest_frame)
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
        with S.video_ws_lock:
            S.video_ws_clients.discard(ws)


@router.get("/video")
def video_mjpeg():
    def gen():
        while True:
            with S.frame_lock:
                frame = S.latest_frame
            if frame:
                yield (
                    b"--frame\r\nContent-Type: image/jpeg\r\n\r\n"
                    + frame
                    + b"\r\n"
                )
            time.sleep(0.033)
    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")
