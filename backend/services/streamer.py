"""WebSocket frame streamer.
backend\services\streamer.py

This module exposes a WebSocket endpoint and streams processed video frames.
Separated from capture and detection to keep the backend modular.
"""

import asyncio
import logging
from fastapi import WebSocket
from backend.services.capture import CameraStream
from backend.services.detector import YOLODetector, ParkingSpaceMonitor
from backend.services.utils import create_overlay, encode_frame_to_base64
from backend.services.config import RTSP_URLS, VIDEO_FILE, USE_VIDEO_FILE

logger = logging.getLogger(__name__)


class VideoStreamManager:
    def __init__(self):
        self.camera = CameraStream(RTSP_URLS)
        self.detector = YOLODetector()
        self.parking_monitor = ParkingSpaceMonitor()

    async def stream_to_websocket(self, websocket: WebSocket) -> None:
        await websocket.accept()
        logger.info("WebSocket client connected")
        await websocket.send_json({
            "status": "waiting_for_frame",
            "message": "Backend ready. Waiting for camera frames..."
        })

        try:
            last_status_time = asyncio.get_event_loop().time()

            while True:
                frame = self.camera.read()

                if frame is None:
                    now = asyncio.get_event_loop().time()
                    if now - last_status_time >= 1.0:
                        await websocket.send_json({
                            "status": "waiting_for_frame",
                            "message": "No frame yet from the camera. Retrying connection...",
                        })
                        last_status_time = now
                    await asyncio.sleep(0.5)
                    continue

                detections = self.detector.detect_vehicles(frame)
                slot_states = self.parking_monitor.evaluate(detections, frame.shape)
                create_overlay(frame, detections, slot_states)

                payload = {
                    "status": "streaming",
                    "message": "Live frame received from camera.",
                    "frame": encode_frame_to_base64(frame),
                    "detections": detections,
                    "parkingSlots": slot_states,
                }
                await websocket.send_json(payload)
                await asyncio.sleep(0.03)

        except Exception as exc:
            logger.exception("WebSocket streaming error: %s", exc)
        finally:
            logger.info("WebSocket client disconnected")
            self.camera.close()