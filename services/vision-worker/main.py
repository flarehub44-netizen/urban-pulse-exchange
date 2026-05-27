"""
ViaX vision worker — samples HLS/snapshot URLs, counts crossings, ingests metrics.

Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLL_INTERVAL_SEC (default 45)
Requires: ffmpeg on PATH for HLS streams
"""

from __future__ import annotations

import logging
import os
import time

from supabase_client import SupabaseWorkerClient
from worker_cycle import run_cycle

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vision-worker")


def main() -> None:
    client = SupabaseWorkerClient()
    interval = int(os.environ.get("POLL_INTERVAL_SEC", "45"))
    log.info("Starting vision worker (interval=%ss, ffmpeg HLS)", interval)

    while True:
        try:
            run_cycle(client)
        except Exception:
            log.exception("Poll cycle failed")
        time.sleep(interval)


if __name__ == "__main__":
    main()
