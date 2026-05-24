
-- Region for Av. Paulista (CET-SP snapshot)
INSERT INTO public.regions (id, name, x, y, r, congestion, flow, avg_speed)
VALUES ('cetsp-paulista', 'Avenida Paulista (SP)', 52, 48, 6, 0.6, 1800, 28)
ON CONFLICT (id) DO NOTHING;

-- Camera (snapshot via proxy)
INSERT INTO public.cameras (id, name, location, region_id, status, stream_url, detection_ok)
VALUES (
  'cetsp-paulista',
  'Av. Paulista · CET-SP (Cam 23/2)',
  'Avenida Paulista (SP)',
  'cetsp-paulista',
  'online',
  '/api/public/snapshot-proxy/cetsp-paulista/snapshot.jpg',
  false
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  region_id = EXCLUDED.region_id,
  status = EXCLUDED.status,
  stream_url = EXCLUDED.stream_url,
  updated_at = now();

-- Live market tied to the camera
INSERT INTO public.markets (
  id, question, region, region_id, category, target,
  ai_value, ai_side, ai_confidence, ends_at, status, accept_bets,
  data_source, resolution_metric
)
VALUES (
  'backup-paulista-live',
  'Velocidade média na Av. Paulista ficará abaixo de 30 km/h nas próximas 6h?',
  'Avenida Paulista (SP)',
  'cetsp-paulista',
  'Velocidade',
  30,
  28,
  'YES',
  0.6,
  now() + interval '6 hours',
  'live',
  true,
  'regions',
  'avg_speed'
)
ON CONFLICT (id) DO NOTHING;
