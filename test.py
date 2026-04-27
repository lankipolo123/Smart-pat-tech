import cv2
import os

urls = [
    "rtsp://admin:admin123@192.168.1.14:554/",
    "rtsp://admin:admin123@192.168.1.14:554/live.sdp",
    "rtsp://admin:admin123@192.168.1.14:554/stream1",
    "rtsp://admin:admin123@192.168.1.14:554/live/ch0",
    "rtsp://admin:admin123@192.168.1.14:554/video1",
    "rtsp://admin:admin123@192.168.1.14:8554/",
]

for url in urls:
    os.environ.pop('OPENCV_FFMPEG_CAPTURE_OPTIONS', None)
    os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp'
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    opened = cap.isOpened()
    print(f"{'✓ WORKS' if opened else '✗ FAIL '} → {url}")
    cap.release()