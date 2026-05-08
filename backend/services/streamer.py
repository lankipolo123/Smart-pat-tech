

import asyncio
import logging
from typing import Optional

import cv2
import numpy as np
from fastapi import WebSocket
from backend.services.detector import YOLODetector, ParkingSpaceMonitor
from backend.services.utils import create_overlay, encode_frame_to_base64
from backend.services.config import RTSP_URLS

logger = logging.getLogger(__name__)


class CameraStream:
    def __init__(self, rtsp_urls: list[str]):
        self.source_urls = rtsp_urls
        self.capture: Optional[cv2.VideoCapture] = None

    def open(self) -> None:
        self.close()
        for url in self.source_urls:
            capture = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if capture.isOpened():
                self.capture = capture
                return
            capture.release()

    def read(self) -> np.ndarray:
        if self.capture is None or not self.capture.isOpened():
            self.open()
        if self.capture is None or not self.capture.isOpened():
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "Camera unavailable", (170, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
            return frame
        ok, frame = self.capture.read()
        if ok and frame is not None:
            return frame
        self.open()
        return np.zeros((480, 640, 3), dtype=np.uint8)

    def close(self) -> None:
        if self.capture is not None:
            self.capture.release()
            self.capture = None


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
