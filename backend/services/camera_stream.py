
"""
backend\services\camera_stream.py
Camera capture module.
Handles RTSP streams with TCP/UDP transport fallback and automatic reconnection.
"""

import logging
import os
import cv2
import numpy as np
from typing import List, Optional
from .config import RTSP_TRANSPORT, RTSP_URLS, VIDEO_FILE, USE_VIDEO_FILE

logger = logging.getLogger(__name__)


class CameraStream:
    def __init__(self, rtsp_urls: Optional[List[str]] = None, source_name: str = "cctv_camera"):
        self.source_urls = rtsp_urls or RTSP_URLS
        self.source_name = source_name
        self.capture: Optional[cv2.VideoCapture] = None
        self.current_url: Optional[str] = None
        self.last_attempts: List[dict] = []
        logger.info("Initialized CameraStream with source_name=%s, sources=%s",
                    self.source_name, self.source_urls)

    def _attempt_open_url(self, url: str) -> Optional[cv2.VideoCapture]:
        self.last_attempts = []

        def try_capture_with_transport(transport: str) -> Optional[cv2.VideoCapture]:
            os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = f'rtsp_transport;{transport}'
            capture = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)
            opened = capture.isOpened()
            attempt = {
                "url": url,
                "transport": transport,
                "backend": "ffmpeg",
                "opened": opened,
            }
            self.last_attempts.append(attempt)
            logger.info("RTSP attempt open=%s url=%s transport=%s", opened, url, transport)
            if opened:
                return capture
            capture.release()
            return None

        capture = try_capture_with_transport(RTSP_TRANSPORT)
        if capture is not None:
            return capture

        if RTSP_TRANSPORT.lower() != 'udp':
            capture = try_capture_with_transport('udp')
            if capture is not None:
                return capture

        logger.info("RTSP FFMPEG backend failed, trying default OpenCV backend: %s", url)
        fallback_capture = cv2.VideoCapture(url)
        fallback_capture.set(cv2.CAP_PROP_BUFFERSIZE, 3)
        fallback_opened = fallback_capture.isOpened()
        self.last_attempts.append({
            "url": url,
            "transport": "default",
            "backend": "opencv",
            "opened": fallback_opened,
        })
        logger.info("Fallback attempt open=%s url=%s", fallback_opened, url)
        if fallback_opened:
            return fallback_capture
        fallback_capture.release()
        return None

    def open(self) -> None:
        if self.capture is not None:
            self.capture.release()
            self.capture = None

        if not self.source_urls:
            logger.error("No RTSP source URLs configured")
            return

        for url in self.source_urls:
            logger.info("Attempting camera stream URL: %s", url)
            capture = self._attempt_open_url(url)
            if capture is not None:
                self.capture = capture
                self.current_url = url
                logger.info("Camera stream opened successfully: %s", url)
                return

        logger.error("Unable to open any configured RTSP URLs")
        self.current_url = None

    def read(self) -> np.ndarray:
        if self.capture is None or not self.capture.isOpened():
            self.open()

        if self.capture is None or not self.capture.isOpened():
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = [50, 50, 50]
            cv2.putText(frame, "RTSP Stream Unavailable", (120, 230),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 165, 255), 2)
            cv2.putText(frame, "Waiting for camera connection...", (100, 270),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.65, (200, 200, 200), 1)
            return frame

        success, frame = self.capture.read()
        if not success or frame is None:
            logger.warning("Frame capture failed, reopening stream")
            self.open()
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = [50, 50, 50]
            cv2.putText(frame, "Reconnecting to stream...", (140, 250),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 165, 255), 2)
            return frame

        return frame

    def close(self) -> None:
        if self.capture is not None:
            logger.info("Closing camera stream: %s", self.current_url)
            self.capture.release()
            self.capture = None
            self.current_url = None
