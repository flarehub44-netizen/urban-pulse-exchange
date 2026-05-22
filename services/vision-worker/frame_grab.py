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
