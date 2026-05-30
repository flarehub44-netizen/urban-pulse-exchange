"""Shared vision worker cycle helpers."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from counter import CountLine, LineCrossCounter
from frame_grab import grab_frames
from supabase_client import SupabaseWorkerClient

log = logging.getLogger("vision-worker.cycle")

BURST_FRAMES = int(os.environ.get("VISION_BURST_FRAMES", "10"))
BURST_FPS = int(os.environ.get("VISION_BURST_FPS", "4"))
APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://viax.lovable.app").rstrip("/")


def _resolve_url(url: str) -> str:
    """Resolve relative proxy URLs (e.g. /api/public/hls-proxy/...) against APP_BASE_URL."""
    if url.startswith("/"):
        return f"{APP_BASE_URL}{url}"
    return url


def process_camera(client: SupabaseWorkerClient, cam: dict) -> None:
    cam_id = cam["id"]
    url = cam.get("stream_url")
    if url:
        url = _resolve_url(url)
    if not url:
        return

    frames = grab_frames(url, count=BURST_FRAMES, fps=BURST_FPS)
    if not frames:
        log.warning("No frames for camera %s", cam_id)
        return

    line = CountLine.from_json(cam.get("count_line")) or CountLine(0.1, 0.5, 0.9, 0.5)
    counter = LineCrossCounter(line)
    for fr in frames:
        counter.process_frame(fr)
    count = counter.session_total

    frame_ratio = min(1.0, len(frames) / max(BURST_FRAMES, 1))
    confidence = round(0.5 + 0.3 * frame_ratio + (0.15 if count > 0 else 0.0), 2)

    result = client.ingest_metrics(cam_id, count, confidence)
    log.info(
        "Ingested camera=%s frames=%d count=%s ok=%s",
        cam_id,
        len(frames),
        count,
        result.get("ok"),
    )


def run_cycle(client: SupabaseWorkerClient) -> tuple[int, int, int, str | None]:
    source = os.environ.get("VISION_WORKER_SOURCE", "docker")
    started = datetime.now(timezone.utc)
    total = ok = failed = 0
    error_summary: str | None = None

    try:
        cameras = client.list_cameras()
        total = len(cameras)
        log.info("Processing %d online cameras (source=%s)", total, source)
        for cam in cameras:
            try:
                process_camera(client, cam)
                ok += 1
            except Exception:
                failed += 1
                log.exception("Camera %s failed", cam.get("id"))
    except Exception as exc:
        error_summary = str(exc)[:500]
        log.exception("Poll cycle failed")
        client.record_run(
            started_at=started.isoformat(),
            source=source,
            cameras_total=total,
            cameras_ok=ok,
            cameras_failed=failed,
            error_summary=error_summary,
        )
        raise

    client.record_run(
        started_at=started.isoformat(),
        source=source,
        cameras_total=total,
        cameras_ok=ok,
        cameras_failed=failed,
        error_summary=error_summary,
    )
    log.info("Cycle done total=%s ok=%s failed=%s", total, ok, failed)
    return total, ok, failed, error_summary
