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

Requires OpenCV/ffmpeg support for your stream URLs (HLS may need `opencv` built with ffmpeg).

## Deploy

Run on the same VPS as MediaMTX via systemd or Docker. See [docs/CAMERA_STREAMING.md](../../docs/CAMERA_STREAMING.md).
