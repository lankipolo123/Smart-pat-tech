"""Frame utilities.
backend/services/utils.py

Helpers for drawing overlays on frames and encoding them for WebSocket transmission.
"""

import base64
import logging
from typing import List, Dict, Any

import cv2
import numpy as np

logger = logging.getLogger(__name__)

COLOR_OCCUPIED  = (0, 0, 220)
COLOR_AVAILABLE = (0, 200, 0)
COLOR_DETECTION = (0, 165, 255)
COLOR_TEXT      = (255, 255, 255)


def create_overlay(
    frame: np.ndarray,
    detections: List[Dict[str, Any]],
    slot_states: List[Dict[str, Any]],
) -> None:
    if frame is None:
        return

    h, w = frame.shape[:2]

    for slot in slot_states:
        bbox = slot.get("bbox", [])
        if not bbox or len(bbox) < 4:
            continue

        x1 = int(bbox[0] * w)
        y1 = int(bbox[1] * h)
        x2 = int(bbox[2] * w)
        y2 = int(bbox[3] * h)

        color = COLOR_OCCUPIED if slot["status"] == "occupied" else COLOR_AVAILABLE

        overlay = frame.copy()
        cv2.rectangle(overlay, (x1, y1), (x2, y2), color, -1)
        cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, slot["id"], (x1 + 4, y1 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, COLOR_TEXT, 1, cv2.LINE_AA)

    for det in detections:
        bbox = det.get("bbox", [])
        if not bbox or len(bbox) < 4:
            continue

        x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
        label = f"{det.get('label', 'vehicle')} {det.get('confidence', 0):.2f}"

        cv2.rectangle(frame, (x1, y1), (x2, y2), COLOR_DETECTION, 2)
        cv2.putText(frame, label, (x1, max(y1 - 6, 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_DETECTION, 1, cv2.LINE_AA)


def encode_frame_to_base64(frame: np.ndarray, quality: int = 75) -> str:
    if frame is None:
        return ""
    try:
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        success, buffer = cv2.imencode(".jpg", frame, encode_params)
        if not success:
            logger.warning("Frame encoding failed")
            return ""
        return base64.b64encode(buffer.tobytes()).decode("utf-8")
    except Exception as exc:
        logger.exception("Error encoding frame: %s", exc)
        return ""