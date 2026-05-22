"""
ViaX vision worker — samples HLS/snapshot URLs, counts crossings, ingests metrics.

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLL_INTERVAL_SEC (default 45)
Requires: ffmpeg on PATH for HLS streams
"""

from __future__ import annotations

import logging
import os
import time

from counter import CountLine, LineCrossCounter
from frame_grab import grab_frame
from supabase_client import SupabaseWorkerClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vision-worker")


def process_camera(client: SupabaseWorkerClient, cam: dict) -> None:
    cam_id = cam["id"]
    url = cam.get("stream_url")
    if not url:
        return

    frame = grab_frame(url)
    if frame is None:
        log.warning("No frame for camera %s", cam_id)
        return

    line = CountLine.from_json(cam.get("count_line")) or CountLine(0.1, 0.5, 0.9, 0.5)
    counter = LineCrossCounter(line)
    count = counter.process_frame(frame)
    confidence = 0.7 if count > 0 else 0.55

    result = client.ingest_metrics(cam_id, count, confidence)
    log.info("Ingested camera=%s count=%s ok=%s", cam_id, count, result.get("ok"))


def main() -> None:
    client = SupabaseWorkerClient()
    interval = int(os.environ.get("POLL_INTERVAL_SEC", "45"))
    log.info("Starting vision worker (interval=%ss, ffmpeg HLS)", interval)

    while True:
        try:
            cameras = client.list_cameras()
            log.info("Processing %d online cameras", len(cameras))
            for cam in cameras:
                try:
                    process_camera(client, cam)
                except Exception:
                    log.exception("Camera %s failed", cam.get("id"))
        except Exception:
            log.exception("Poll cycle failed")
        time.sleep(interval)


if __name__ == "__main__":
    main()
