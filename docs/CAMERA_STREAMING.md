# Stream de câmeras ViaX

## Status: HLS público (fase 1)

Câmeras demo seedadas com stream HTTPS Mux — playback sem VPS.

| Região | Camera ID | Stream |
|--------|-----------|--------|
| paulista | `demo-cam-paulista` | Mux test HLS |
| marginal | `demo-cam-marginal` | Mux test HLS |
| pinheiros | `demo-cam-pinheiros` | Mux test HLS |

## Checklist pós-deploy

1. `npm run db:push` (migrations `20260605*`)
2. `npm run deploy`
3. Admin → **Fontes** — 3 câmeras `online`
4. Mercado **live** (ex. paulista) → faixa **Ao vivo** com `<video>`
5. `/urbanmind` — mesmo strip
6. Subir vision-worker (métricas + `detection_ok`)

```bash
# RPC smoke (SQL Editor)
select public.list_live_cameras('paulista');
```

## Vision worker

```bash
cd infra/stream-stack
cp .env.example .env
# preencher SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
docker compose up -d --build
```

Ou local:

```bash
cd services/vision-worker
pip install -r requirements.txt
# ffmpeg no PATH (choco install ffmpeg / apt install ffmpeg)
export SUPABASE_URL=...
export SUPABASE_SERVICE_ROLE_KEY=...
python main.py
```

## Oráculo por câmera

1. Aguarde métricas estáveis (worker rodando ~10+ min)
2. Admin → **Sistema** → **Oráculo por câmera** = ON
3. Opcional: desligar **Simulador de regiões**
4. Mercados `*-live` usam `data_source = camera` (migration `20260605000001`)

## Arquitetura

1. **HLS HTTPS** → `cameras.stream_url`
2. **ViaX** → `list_live_cameras` + `CameraPlayer` (hls.js)
3. **vision-worker** → ffmpeg frame → `ingest_camera_metrics`
4. **Oráculo** → `camera_metrics` + `regions`

## MediaMTX (fase 2 — VPS)

```bash
cd infra/mediamtx
cp .env.example .env
docker compose up -d
```

Substitua URLs no admin por `https://stream.seudominio.com/paulista/index.m3u8`.

## Regras de URL

- Só **HTTPS** + `.m3u8` (ou snapshot) no app de produção
- Nunca `rtsp://` no banco
- HTTP quebra mixed content no `workers.dev`

## LGPD

- Tráfego público; aviso na UI
- Frames só in-memory no worker

## Troubleshooting

| Sintoma | Ação |
|---------|------|
| "Sem sinal ao vivo" | `db:push` + câmeras `online` |
| Vídeo não carrega | Abrir URL em nova aba; verificar CORS do host |
| Detecção parada | Worker down ou ffmpeg ausente — badge amarelo no admin |
| Oráculo falha | `camera_oracle_enabled` + câmera `detection_ok` |
