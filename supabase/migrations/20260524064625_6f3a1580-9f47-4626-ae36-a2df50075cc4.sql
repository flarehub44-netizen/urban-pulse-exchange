
-- Regiões DER-SP
INSERT INTO public.regions (id, name, x, y, r, congestion, flow, avg_speed) VALUES
  ('der-sp-litoral', 'SP-055 Litoral Norte (DER-SP)', 70, 75, 8, 0.55, 1800, 55),
  ('der-sp-vale', 'SP-125 Vale do Paraíba (DER-SP)', 75, 45, 8, 0.45, 2000, 65),
  ('der-sp-mantiqueira', 'SP-123 Campos do Jordão (DER-SP)', 72, 25, 6, 0.40, 1200, 50)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, x = EXCLUDED.x, y = EXCLUDED.y, r = EXCLUDED.r;

-- 10 câmeras DER-SP
INSERT INTO public.cameras (id, name, location, region_id, status, stream_url, detection_ok) VALUES
  ('der-sp-sp055-km073', 'SP-055 km 73 · DER-SP', 'São Sebastião (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM073/stream.m3u8', false),
  ('der-sp-sp055-km083', 'SP-055 km 83,5 · DER-SP', 'Litoral Norte (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM083/stream.m3u8', false),
  ('der-sp-sp055-km110', 'SP-055 km 110 · DER-SP', 'Caraguatatuba (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM110/stream.m3u8', false),
  ('der-sp-sp055-km168', 'SP-055 km 168 · DER-SP', 'Litoral Norte (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM168/stream.m3u8', false),
  ('der-sp-sp055-km193', 'SP-055 km 193 · DER-SP', 'Bertioga (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM193/stream.m3u8', false),
  ('der-sp-sp055-km211', 'SP-055 km 211 · DER-SP', 'Bertioga/Santos (SP-055)', 'der-sp-litoral', 'online', '/api/public/hls-proxy/der-sp-SP055-KM211/stream.m3u8', false),
  ('der-sp-sp125-km042', 'SP-125 km 42 · DER-SP', 'Vale do Paraíba (SP-125)', 'der-sp-vale', 'online', '/api/public/hls-proxy/der-sp-SP125-KM042/stream.m3u8', false),
  ('der-sp-sp125-km067', 'SP-125 km 67 · DER-SP', 'Vale do Paraíba (SP-125)', 'der-sp-vale', 'online', '/api/public/hls-proxy/der-sp-SP125-KM067/stream.m3u8', false),
  ('der-sp-sp125-km088', 'SP-125 km 88 · DER-SP', 'Ubatuba/Oswaldo Cruz (SP-125)', 'der-sp-vale', 'online', '/api/public/hls-proxy/der-sp-SP125-KM088/stream.m3u8', false),
  ('der-sp-sp123-km008', 'SP-123 km 8 · DER-SP', 'Campos do Jordão (SP-123)', 'der-sp-mantiqueira', 'online', '/api/public/hls-proxy/der-sp-SP123-KM008/stream.m3u8', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, location = EXCLUDED.location, region_id = EXCLUDED.region_id,
  status = EXCLUDED.status, stream_url = EXCLUDED.stream_url;

-- 3 mercados (1 por região)
INSERT INTO public.markets (
  id, question, region, region_id, category, target, ai_value, ai_side, ai_confidence,
  ends_at, status, accept_bets, data_source, resolution_metric, comparison_op
) VALUES
  ('der-sp-litoral-speed', 'Velocidade média na SP-055 (Litoral Norte) ficará ≥ 60 km/h nas próximas 6h?', 'SP-055 Litoral Norte (DER-SP)', 'der-sp-litoral', 'Velocidade', 60, 55, 'NO', 0.6, now() + interval '6 hours', 'live', true, 'regions', 'avg_speed', 'gte'),
  ('der-sp-vale-speed', 'Velocidade média na SP-125 (Vale do Paraíba) ficará ≥ 70 km/h nas próximas 6h?', 'SP-125 Vale do Paraíba (DER-SP)', 'der-sp-vale', 'Velocidade', 70, 65, 'NO', 0.6, now() + interval '6 hours', 'live', true, 'regions', 'avg_speed', 'gte'),
  ('der-sp-mantiqueira-speed', 'Velocidade média na SP-123 (Campos do Jordão) ficará ≥ 55 km/h nas próximas 6h?', 'SP-123 Campos do Jordão (DER-SP)', 'der-sp-mantiqueira', 'Velocidade', 55, 50, 'NO', 0.6, now() + interval '6 hours', 'live', true, 'regions', 'avg_speed', 'gte')
ON CONFLICT (id) DO UPDATE SET
  question = EXCLUDED.question, region_id = EXCLUDED.region_id,
  ai_value = EXCLUDED.ai_value, ends_at = EXCLUDED.ends_at, status = EXCLUDED.status;
