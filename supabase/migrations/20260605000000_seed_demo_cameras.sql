-- Demo cameras: public HTTPS HLS for playback without VPS (replace URL when MediaMTX is ready)

insert into public.cameras (
  id, region_id, name, location, status, stream_url, count_line, detection_ok
) values
  (
    'demo-cam-paulista',
    'paulista',
    'Paulista · Ao vivo (demo)',
    'Av. Paulista',
    'online',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    '{"x1":0.1,"y1":0.5,"x2":0.9,"y2":0.5}'::jsonb,
    false
  ),
  (
    'demo-cam-marginal',
    'marginal',
    'Marginal · Ao vivo (demo)',
    'Marginal Tietê',
    'online',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    '{"x1":0.1,"y1":0.5,"x2":0.9,"y2":0.5}'::jsonb,
    false
  ),
  (
    'demo-cam-pinheiros',
    'pinheiros',
    'Pinheiros · Ao vivo (demo)',
    'Pinheiros',
    'online',
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    '{"x1":0.1,"y1":0.5,"x2":0.9,"y2":0.5}'::jsonb,
    false
  )
on conflict (id) do update set
  region_id = excluded.region_id,
  name = excluded.name,
  location = excluded.location,
  status = excluded.status,
  stream_url = excluded.stream_url,
  count_line = excluded.count_line,
  updated_at = now();
