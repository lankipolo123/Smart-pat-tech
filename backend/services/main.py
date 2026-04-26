

import logging
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from .streamer import VideoStreamManager
from .config import RTSP_URLS, WS_PATH, RTSP_URL, VIDEO_FILE, USE_VIDEO_FILE

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="SmartPark YOLOv8 CCTV Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    stream_manager = VideoStreamManager()
except Exception as exc:
    logger.exception("Failed to initialize VideoStreamManager: %s", exc)
    stream_manager = None


@app.on_event("startup")
async def startup_event():
    camera_source = VIDEO_FILE if USE_VIDEO_FILE else RTSP_URL
    logger.info("SmartPark backend starting with camera source: %s", camera_source)


@app.get("/")
async def root():
    return {"status": "ok", "service": "SmartPark CCTV YOLOv8 backend"}


def _redact_rtsp_url(url: str) -> str:
    if not url or "@" not in url:
        return url
    try:
        scheme, rest = url.split("://", 1)
        auth, host = rest.split("@", 1)
        return f"{scheme}://REDACTED@{host}"
    except ValueError:
        return url


@app.websocket(WS_PATH)
async def websocket_endpoint(websocket: WebSocket):
    if stream_manager is None:
        await websocket.accept()
        await websocket.send_json({
            "status": "error",
            "message": "Backend streaming service is unavailable. Check backend logs.",
        })
        await websocket.close()
        return
    await stream_manager.stream_to_websocket(websocket)


@app.get("/camera/status")
async def camera_status():
    source_urls = [
        _redact_rtsp_url(url)
        for url in (RTSP_URLS if not USE_VIDEO_FILE else [VIDEO_FILE])
    ]
    camera_open = False
    current_url = None
    attempt_log = []

    if stream_manager and stream_manager.camera:
        camera_open = (
            stream_manager.camera.capture is not None
            and stream_manager.camera.capture.isOpened()
        )
        current_url = stream_manager.camera.current_url
        attempt_log = getattr(stream_manager.camera, "last_attempts", [])

    return {
        "status": "configured",
        "useVideoFile": USE_VIDEO_FILE,
        "cameraSource": _redact_rtsp_url(RTSP_URL) if not USE_VIDEO_FILE else VIDEO_FILE,
        "cameraCandidates": source_urls,
        "cameraOpen": camera_open,
        "currentSourceUrl": _redact_rtsp_url(current_url) if current_url else None,
        "cameraAttemptLog": attempt_log,
        "message": "If the camera source is incorrect, set RTSP_URL or RTSP_PATHS in backend config.",
    }


@app.get("/camera/test")
async def camera_test():
    if stream_manager is None or stream_manager.camera is None:
        return {
            "status": "error",
            "message": "Camera service unavailable or failed to initialize.",
        }
    stream_manager.camera.open()
    camera_open = (
        stream_manager.camera.capture is not None
        and stream_manager.camera.capture.isOpened()
    )
    return {
        "status": "tested",
        "cameraOpen": camera_open,
        "currentSourceUrl": (
            _redact_rtsp_url(stream_manager.camera.current_url)
            if stream_manager.camera.current_url else None
        ),
        "cameraAttemptLog": getattr(stream_manager.camera, "last_attempts", []),
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)