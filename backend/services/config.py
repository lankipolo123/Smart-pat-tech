import os
from dotenv import load_dotenv
from urllib.parse import quote

load_dotenv()

CAMERA_ID  = os.getenv("CAMERA_ID",  "")
CAMERA_IP  = os.getenv("CAMERA_IP",  "")
CAMERA_MAC = os.getenv("CAMERA_MAC", "")

RTSP_PORT = int(os.getenv("RTSP_PORT", "554"))
DEFAULT_RTSP_PATHS = [
    "live.sdp",
    "live/ch0",
    "live",
    "stream",
    "h264",
    "ch0_0.264",
    "cam/realmonitor?channel=1&subtype=0",
    "cam/realmonitor?channel=1&subtype=1",
    "Streaming/Channels/101",
    "Streaming/Channels/102",
    "h264/ch1/main/av_stream",
    "h264/ch0/av_stream",
    "live/0",
    "live/1",
    "media/video1",
]
RTSP_PATHS = [
    p.strip().lstrip("/")
    for p in os.getenv("RTSP_PATHS", ",".join(DEFAULT_RTSP_PATHS)).split(",")
    if p.strip()
]
RTSP_TRANSPORT = os.getenv("RTSP_TRANSPORT", "tcp")
RTSP_USER      = os.getenv("RTSP_USER",      "")
RTSP_PASSWORD  = os.getenv("RTSP_PASSWORD",  "")

VIDEO_FILE     = os.getenv("VIDEO_FILE", "")
USE_VIDEO_FILE = bool(VIDEO_FILE)


def _quote(v: str) -> str:
    return quote(v or "", safe="")


def _build_rtsp_url(user: str, password: str, ip: str, port: int, path: str) -> str:
    return f"rtsp://{_quote(user)}:{_quote(password)}@{ip}:{port}/{quote(path or '', safe='/?&=')}"


def _build_rtsp_urls(user, password, ip, port, paths):
    if user and password:
        return [_build_rtsp_url(user, password, ip, port, "")] + \
               [_build_rtsp_url(user, password, ip, port, p) for p in paths]
    return [f"rtsp://{ip}:{port}/"] + \
           [f"rtsp://{ip}:{port}/{quote(p, safe='/?&=')}" for p in paths]


RTSP_URL_OVERRIDE = os.getenv("RTSP_URL", "")
RTSP_URLS = [RTSP_URL_OVERRIDE] if RTSP_URL_OVERRIDE else _build_rtsp_urls(
    RTSP_USER, RTSP_PASSWORD, CAMERA_IP, RTSP_PORT, RTSP_PATHS
)
RTSP_URL = RTSP_URLS[0] if RTSP_URLS else ""

WS_PATH = "/ws/video"