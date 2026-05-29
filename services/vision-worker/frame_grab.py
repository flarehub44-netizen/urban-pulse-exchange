"""Grab a single frame from HLS/RTSP/HTTP via ffmpeg (more reliable than OpenCV on HLS)."""

from __future__ import annotations

import logging
import subprocess
from typing import TYPE_CHECKING

import cv2
import numpy as np

if TYPE_CHECKING:
    pass

log = logging.getLogger("vision-worker.frame_grab")

TIMEOUT_SEC = 15


def _is_image_url(url: str) -> bool:
    lower = url.lower()
    return any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")) or "snapshot" in lower


def grab_frame_ffmpeg(url: str) -> np.ndarray | None:
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        url,
        "-frames:v",
        "1",
        "-f",
        "image2pipe",
        "-vcodec",
        "png",
        "pipe:1",
    ]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            timeout=TIMEOUT_SEC,
            check=False,
        )
    except subprocess.TimeoutExpired:
        log.warning("ffmpeg timeout for %s", url[:80])
        return None
    except FileNotFoundError:
        log.error("ffmpeg not found on PATH")
        return None

    if proc.returncode != 0 or not proc.stdout:
        log.warning("ffmpeg failed rc=%s stderr=%s", proc.returncode, proc.stderr[:200])
        return None

    arr = np.frombuffer(proc.stdout, dtype=np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return frame


def grab_frame(url: str) -> np.ndarray | None:
    if _is_image_url(url):
        try:
            import httpx

            r = httpx.get(url, timeout=TIMEOUT_SEC, follow_redirects=True)
            r.raise_for_status()
            arr = np.frombuffer(r.content, dtype=np.uint8)
            return cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception as e:
            log.warning("image fetch failed: %s", e)
            return None

    frame = grab_frame_ffmpeg(url)
    if frame is not None:
        return frame

    cap = cv2.VideoCapture(url)
    try:
        if not cap.isOpened():
            return None
        ok, frame = cap.read()
        return frame if ok else None
    finally:
        cap.release()


def grab_frames_ffmpeg(url: str, count: int = 8, fps: int = 4) -> list[np.ndarray]:
    """Capture a short burst of consecutive frames at `fps` for motion analysis."""
    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        url,
        "-vf",
        f"fps={fps}",
        "-frames:v",
        str(count),
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "pipe:1",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, timeout=TIMEOUT_SEC + 10, check=False)
    except subprocess.TimeoutExpired:
        log.warning("ffmpeg burst timeout for %s", url[:80])
        return []
    except FileNotFoundError:
        log.error("ffmpeg not found on PATH")
        return []

    if proc.returncode != 0 or not proc.stdout:
        log.warning("ffmpeg burst rc=%s stderr=%s", proc.returncode, proc.stderr[:200])
        return []

    # Split concatenated MJPEG stream by SOI/EOI markers.
    data = proc.stdout
    frames: list[np.ndarray] = []
    start = 0
    while True:
        soi = data.find(b"\xff\xd8", start)
        if soi < 0:
            break
        eoi = data.find(b"\xff\xd9", soi + 2)
        if eoi < 0:
            break
        chunk = data[soi : eoi + 2]
        arr = np.frombuffer(chunk, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is not None:
            frames.append(img)
        start = eoi + 2
    return frames


def grab_frames(url: str, count: int = 8, fps: int = 4) -> list[np.ndarray]:
    """Burst capture. For snapshot URLs, polls the endpoint sequentially."""
    if _is_image_url(url):
        import time as _time

        import httpx

        out: list[np.ndarray] = []
        delay = 1.0 / max(fps, 1)
        try:
            with httpx.Client(timeout=TIMEOUT_SEC, follow_redirects=True) as c:
                for _ in range(count):
                    try:
                        r = c.get(url)
                        r.raise_for_status()
                        arr = np.frombuffer(r.content, dtype=np.uint8)
                        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                        if img is not None:
                            out.append(img)
                    except Exception as e:
                        log.warning("snapshot poll failed: %s", e)
                    _time.sleep(delay)
        except Exception as e:
            log.warning("snapshot burst failed: %s", e)
        return out

    frames = grab_frames_ffmpeg(url, count=count, fps=fps)
    if frames:
        return frames

    # Fallback: OpenCV VideoCapture sequential reads.
    cap = cv2.VideoCapture(url)
    out: list[np.ndarray] = []
    try:
        if not cap.isOpened():
            return []
        for _ in range(count):
            ok, fr = cap.read()
            if not ok or fr is None:
                break
            out.append(fr)
    finally:
        cap.release()
    return out
