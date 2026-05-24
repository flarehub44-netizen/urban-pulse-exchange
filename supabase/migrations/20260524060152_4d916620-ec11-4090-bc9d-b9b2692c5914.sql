INSERT INTO public.regions (id, name, x, y, r, congestion, flow, avg_speed)
VALUES ('br-116-sp', 'BR-116 km 225 (SP)', 50, 50, 8, 0.5, 2200, 70)
ON CONFLICT (id) DO NOTHING;

UPDATE public.cameras
SET region_id = 'br-116-sp',
    stream_url = '/api/public/hls-proxy/motiva-br116-km225/index.m3u8',
    status = 'online',
    name = 'BR-116 km 225 · Ao vivo (Motiva)',
    location = 'Rodovia BR-116 km 225 (SP)',
    updated_at = now()
WHERE id = 'motiva-br116-km225';

INSERT INTO public.markets (
  id, question, region, region_id, category, target, ai_value, ai_side,
  ai_confidence, ends_at, status, accept_bets, data_source, resolution_metric
)
VALUES (
  'backup-br116-live',
  'Velocidade média na BR-116 km 225 abaixo de 60 km/h às 19h?',
  'BR-116 km 225 (SP)',
  'br-116-sp',
  'Velocidade',
  60,
  68,
  'NO',
  0.62,
  now() + interval '6 hours',
  'live',
  true,
  'regions',
  'avg_speed'
)
ON CONFLICT (id) DO UPDATE
SET region_id = EXCLUDED.region_id,
    status = 'live',
    accept_bets = true,
    ends_at = EXCLUDED.ends_at,
    updated_at = now();