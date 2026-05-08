import cv2
import threading

# ─────────────────────────────────────────────
# EDIT THESE 3 VALUES
# ─────────────────────────────────────────────
CAMERA_IP     = "192.168.1.14"
RTSP_USER     = "admin"
RTSP_PASSWORD = "admin123"
# ─────────────────────────────────────────────

RTSP_PATHS = [
    "live/ch0",
    "live/ch1",
    "stream1",
    "stream2",
    "live/main",
    "live/sub",
    "ch01.264",
    "ch02.264",
    "h264/ch1/main/av_stream",
    "h264/ch1/sub/av_stream",
    "",
]

PORTS     = [554, 8554]
TIMEOUT_S = 6


def try_open(url: str) -> bool:
    result = [False]
    cap_holder = [None]

    def _try():
        try:
            c = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            cap_holder[0] = c
            if c.isOpened():
                ret, frame = c.read()
                if ret and frame is not None:
                    result[0] = True
        except Exception:
            pass

    t = threading.Thread(target=_try, daemon=True)
    t.start()
    t.join(timeout=TIMEOUT_S)

    # If thread still alive (OpenCV ignoring timeout props), force-release cap
    if t.is_alive():
        try:
            if cap_holder[0] is not None:
                cap_holder[0].release()
        except Exception:
            pass
        t.join(timeout=2)

    return result[0]


def main():
    print("=" * 55)
    print("  RTSP Camera Connection Tester")
    print("=" * 55)
    print(f"  Camera IP : {CAMERA_IP}")
    print(f"  Username  : {RTSP_USER}")
    print(f"  Password  : {RTSP_PASSWORD}")
    print(f"  Timeout   : {TIMEOUT_S}s per URL")
    print("=" * 55)

    found = []

    for port in PORTS:
        for path in RTSP_PATHS:
            if path:
                url = f"rtsp://{RTSP_USER}:{RTSP_PASSWORD}@{CAMERA_IP}:{port}/{path}"
                label = f":{port}/{path}"
            else:
                url = f"rtsp://{RTSP_USER}:{RTSP_PASSWORD}@{CAMERA_IP}:{port}"
                label = f":{port}"

            print(f"  Testing {label:<35} ... ", end="", flush=True)
            ok = try_open(url)
            if ok:
                print("✅ WORKS")
                found.append(url)
            else:
                print("❌ failed")

    print()
    print("=" * 55)
    if found:
        print("  ✅ WORKING URLs:")
        for u in found:
            print(f"     {u}")
        print()
        print("  👉 Copy a working URL into your app camera settings.")
    else:
        print("  ❌ No working stream found.")
        print()
        print("  Possible reasons:")
        print("  - Wrong username or password")
        print("  - Camera uses a non-standard stream path")
        print("  - RTSP is disabled — check camera web UI:")
        print(f"    http://{CAMERA_IP}")
    print("=" * 55)


if __name__ == "__main__":
    main()