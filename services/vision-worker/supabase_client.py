"""Supabase REST client for vision worker (service role)."""

from __future__ import annotations

import os
from typing import Any

import httpx


class SupabaseWorkerClient:
    def __init__(self) -> None:
        self.url = os.environ["SUPABASE_URL"].rstrip("/")
        self.key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
        }

    def list_cameras(self) -> list[dict[str, Any]]:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                f"{self.url}/rest/v1/rpc/list_cameras_for_ingest",
                headers=self.headers,
                json={},
            )
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, list) else []

    def ingest_metrics(
        self,
        camera_id: str,
        vehicle_count: int,
        confidence: float = 0.7,
    ) -> dict[str, Any]:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                f"{self.url}/rest/v1/rpc/ingest_camera_metrics",
                headers=self.headers,
                json={
                    "p_camera_id": camera_id,
                    "p_vehicle_count": vehicle_count,
                    "p_confidence": confidence,
                },
            )
            r.raise_for_status()
            return r.json()

    def record_run(
        self,
        *,
        started_at: str,
        source: str,
        cameras_total: int,
        cameras_ok: int,
        cameras_failed: int,
        error_summary: str | None = None,
    ) -> dict[str, Any]:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                f"{self.url}/rest/v1/rpc/record_vision_worker_run",
                headers=self.headers,
                json={
                    "p_started_at": started_at,
                    "p_source": source,
                    "p_cameras_total": cameras_total,
                    "p_cameras_ok": cameras_ok,
                    "p_cameras_failed": cameras_failed,
                    "p_error_summary": error_summary,
                },
            )
            r.raise_for_status()
            return r.json()
