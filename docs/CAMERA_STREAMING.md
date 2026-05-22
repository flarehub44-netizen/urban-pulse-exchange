# Stream de câmeras ViaX

## Arquitetura

1. **Câmera IP** → RTSP
2. **MediaMTX** (VPS) → HLS `.m3u8` em `http://<host>:8888/<path>/index.m3u8`
3. **ViaX admin** → cadastra URL HLS em `cameras.stream_url` (nunca RTSP no banco)
4. **vision-worker** → lê frames, conta veículos na `count_line`, RPC `ingest_camera_metrics`
5. **Oráculo** → mercados com `data_source = 'camera'` usam métricas recentes

## Subir MediaMTX

```bash
cd infra/mediamtx
cp .env.example .env
# edit .env with RTSP URLs
docker compose up -d
```

HLS de teste (sem câmera):

```bash
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -f lavfi -i sine -pix_fmt yuv420p -c:v libx264 -tune zerolatency -f rtsp rtsp://127.0.0.1:8554/demo
```

URL para o admin: `http://<vps-ip>:8888/demo/index.m3u8` (use HTTPS via Caddy em produção).

## Cadastro no ViaX

1. Admin → **Fontes** (`/admin/sources`)
2. Nome, região, URL HLS (`https://.../index.m3u8`)
3. Desenhar linha de contagem no preview
4. Status **online**

## Vision worker

```bash
cd services/vision-worker
pip install -r requirements.txt
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python main.py
```

## Variáveis Supabase

| Setting | Descrição |
|---------|-----------|
| `camera_oracle_enabled` | `true` para resolver mercados `data_source=camera` via métricas |
| `regions_simulator_enabled` | `false` quando região usa só câmeras |

## LGPD

- Preferir ROI sem rostos/placas legíveis
- Retenção curta de frames no worker (processar in-memory)
- Aviso na UI: stream pode conter tráfego público

## CORS

Se o player falhar no browser, configure `hlsAllowOrigin` no `mediamtx.yml` ou proxy HLS no mesmo domínio do app.
