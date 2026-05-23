UPDATE public.cameras
SET stream_url = 'https://34.104.32.249.nip.io/SP055-KM110A/stream.m3u8',
    name = 'SP-055 km 110 · Ao vivo',
    location = 'Rodovia SP-055 km 110',
    updated_at = now()
WHERE id = 'demo-cam-marginal';