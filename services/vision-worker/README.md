# ViaX Vision Worker

Polls online cameras from Supabase, samples video frames, estimates vehicle crossings on `count_line`, and calls `ingest_camera_metrics`.

## Setup

```bash
pip install -r requirements.txt
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=...
export POLL_INTERVAL_SEC=45
python main.py
```

Requires **ffmpeg** on PATH for HLS streams (`frame_grab.py`). Docker image includes ffmpeg.

## Docker (recomendado)

```bash
cd infra/stream-stack
cp .env.example .env
docker compose up -d --build
```

## Deploy

Run on the same VPS as MediaMTX via systemd or Docker. See [docs/CAMERA_STREAMING.md](../../docs/CAMERA_STREAMING.md).
