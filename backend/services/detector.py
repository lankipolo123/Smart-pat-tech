"""Vehicle detection and parking space monitoring.
backend\services\detector.py

Handles YOLOv8 inference for vehicle detection and evaluates
which parking slots are occupied based on detection results.
"""

import logging
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Vehicle class IDs in COCO dataset (used by YOLOv8 default weights)
VEHICLE_CLASS_IDS = {2: "car", 3: "motorcycle", 5: "bus", 7: "truck"}

# Default parking slot regions as normalized (x1, y1, x2, y2) relative to frame size.
# These are placeholder zones — adjust to match your actual camera layout.
DEFAULT_PARKING_SLOTS = [
    {"id": "A1", "bbox": [0.05, 0.10, 0.25, 0.45]},
    {"id": "A2", "bbox": [0.28, 0.10, 0.48, 0.45]},
    {"id": "A3", "bbox": [0.51, 0.10, 0.71, 0.45]},
    {"id": "A4", "bbox": [0.74, 0.10, 0.94, 0.45]},
    {"id": "B1", "bbox": [0.05, 0.55, 0.25, 0.90]},
    {"id": "B2", "bbox": [0.28, 0.55, 0.48, 0.90]},
    {"id": "B3", "bbox": [0.51, 0.55, 0.71, 0.90]},
    {"id": "B4", "bbox": [0.74, 0.55, 0.94, 0.90]},
]

IOU_THRESHOLD = 0.15  # Minimum IoU to consider a slot occupied


def _iou(box_a: List[float], box_b: List[float]) -> float:
    """Compute Intersection over Union between two boxes [x1, y1, x2, y2]."""
    xa1 = max(box_a[0], box_b[0])
    ya1 = max(box_a[1], box_b[1])
    xa2 = min(box_a[2], box_b[2])
    ya2 = min(box_a[3], box_b[3])

    inter_w = max(0.0, xa2 - xa1)
    inter_h = max(0.0, ya2 - ya1)
    inter_area = inter_w * inter_h

    area_a = max(0.0, box_a[2] - box_a[0]) * max(0.0, box_a[3] - box_a[1])
    area_b = max(0.0, box_b[2] - box_b[0]) * max(0.0, box_b[3] - box_b[1])
    union_area = area_a + area_b - inter_area

    return inter_area / union_area if union_area > 0 else 0.0


class YOLODetector:
    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.4):
        self.model = None
        self.confidence = confidence
        self.model_path = model_path
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            logger.info("YOLOv8 model loaded: %s", self.model_path)
        except ImportError:
            logger.warning("ultralytics not installed. Detection disabled. Run: pip install ultralytics")
        except Exception as exc:
            logger.exception("Failed to load YOLO model: %s", exc)

    def detect_vehicles(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Run vehicle detection on a frame. Returns list of detection dicts."""
        if self.model is None or frame is None:
            return []

        try:
            results = self.model(frame, conf=self.confidence, verbose=False)
            detections = []

            for result in results:
                for box in result.boxes:
                    cls_id = int(box.cls[0])
                    if cls_id not in VEHICLE_CLASS_IDS:
                        continue

                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    h, w = frame.shape[:2]

                    detections.append({
                        "class_id": cls_id,
                        "label": VEHICLE_CLASS_IDS[cls_id],
                        "confidence": round(conf, 3),
                        "bbox": [x1, y1, x2, y2],
                        # Normalized bbox for slot overlap checks
                        "bbox_norm": [x1 / w, y1 / h, x2 / w, y2 / h],
                    })

            return detections

        except Exception as exc:
            logger.exception("Detection error: %s", exc)
            return []


class ParkingSpaceMonitor:
    def __init__(self, slots: List[Dict] = None):
        self.slots = slots or DEFAULT_PARKING_SLOTS

    def evaluate(self, detections: List[Dict], frame_shape: tuple) -> List[Dict[str, Any]]:
        """Check each parking slot against detections and return occupancy states."""
        slot_states = []

        for slot in self.slots:
            slot_bbox = slot["bbox"]  # normalized
            occupied = False
            matched_label = None

            for det in detections:
                det_bbox = det.get("bbox_norm", [])
                if not det_bbox:
                    continue
                if _iou(slot_bbox, det_bbox) >= IOU_THRESHOLD:
                    occupied = True
                    matched_label = det.get("label")
                    break

            slot_states.append({
                "id": slot["id"],
                "status": "occupied" if occupied else "available",
                "vehicle": matched_label,
                "bbox": slot_bbox,
            })

        return slot_states