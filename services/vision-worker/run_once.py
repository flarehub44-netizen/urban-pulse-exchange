"""Single vision worker cycle with Supabase heartbeat."""

from __future__ import annotations

import logging
import sys

from supabase_client import SupabaseWorkerClient
from worker_cycle import run_cycle

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vision-worker.run_once")


def main() -> int:
    client = SupabaseWorkerClient()
    try:
        run_cycle(client)
        return 0
    except Exception:
        return 1


if __name__ == "__main__":
    sys.exit(main())
