
## Objetivo

Embutir o stream ao vivo da Motiva (BR-116 km 225 SP / CMAF HLS na CloudFront) no ViaX, contornando o CORS restrito (`access-control-allow-origin: https://rodovias.motiva.com.br`) via proxy server-side, e criar uma página de backup live dedicada — equivalente à `/markets/backup-marginal-live` já existente.

## Etapas

### 1. Proxy HLS público — `src/routes/api/public/hls-proxy/$.ts`

Rota server (TanStack file route) que reescreve playlist + segmentos da Motiva:

- `GET /api/public/hls-proxy/{cameraSlug}/index.m3u8` — busca o `.m3u8` upstream com `Origin: https://rodovias.motiva.com.br` e `Referer: https://rodovias.motiva.com.br/`, reescreve URIs absolutas e relativas dos segmentos para `/api/public/hls-proxy/{slug}/seg?u=<base64url>`.
- `GET /api/public/hls-proxy/{cameraSlug}/seg?u=...` — faz stream do segmento `.mp4`/`.ts` upstream com os mesmos headers, repassando `content-type`, `cache-control` (curto), CORS aberto.
- Allowlist server-side de hosts upstream (`d3b8201cy0qzzb.cloudfront.net` + o nip.io existente do SP-055) — não aceitar URL arbitrária para evitar SSRF/open proxy.
- `OPTIONS` handler com CORS headers (`*`, GET, Accept/Range/Content-Type).
- Suporte ao header `Range` (proxy bidirecional) para seek do hls.js.

### 2. Migração Supabase — cadastrar a câmera

Insert na tabela `cameras`:
- `id`: `motiva-br116-km225`
- `name`: `BR-116 km 225 · Ao vivo`
- `region_id`: nova região `br-116-sp` (insert em `regions` se não existir) OU reaproveitar `der-sp` se preferir mais simples — proponho criar `br-116-sp` para manter limpo.
- `stream_url`: URL **interna** do proxy → `/api/public/hls-proxy/motiva-br116-km225/index.m3u8` (relativa funciona no mesmo domínio; usar URL pública estável `https://project--{id}.lovable.app/...` caso necessário).
- `location`: `Rodovia BR-116 km 225 (SP)`
- `status`: `online`

### 3. Mapeamento upstream — pequena tabela em código

Como o proxy precisa saber a URL real upstream a partir do slug, criar `src/lib/hls-upstream-map.ts` (server-side, importado pela rota proxy):
```
motiva-br116-km225 → https://d3b8201cy0qzzb.cloudfront.net/out/v1/4bd31ad7560846e08093f9552f92a8d0/CMAF_HLS/index_1.m3u8
sp055-km110a       → https://34.104.32.249.nip.io/SP055-KM110A/stream.m3u8  (existente; opcional migrar para o proxy)
```

### 4. Rota frontend — `/markets/backup-br116-live`

Espelhar `src/routes/_app/markets.backup-marginal-live.tsx` (ou onde quer que esteja a rota da Marginal — vou copiar a estrutura) trocando título/region/câmera. Continua usando `LiveCameraStrip` + `useLiveCameras('br-116-sp')`, que já consome o `stream_url` da tabela e renderiza via `CameraPlayer` (hls.js).

### 5. Vision worker

Funciona automaticamente: o worker em `services/vision-worker/main.py` itera todas as câmeras e o `frame_grab.py` (ffmpeg) vai consumir a URL do proxy normalmente — ffmpeg não tem restrição CORS.

### 6. Testes / verificação

- `curl` no endpoint do proxy via `stack_modern--invoke-server-function` para validar 200 + playlist reescrita.
- Abrir `/markets/backup-br116-live` no preview e confirmar vídeo ao vivo (sem loop, sem erro CORS).
- `/admin/sources` deve listar a nova câmera; após 1 ciclo do GitHub Actions, `detection_ok = true`.

## Detalhes técnicos

- **Runtime**: server route roda no Cloudflare Worker. Usar `fetch` nativo + streams Web — nada de Node-only.
- **Reescrita do playlist**: parser simples linha-a-linha (HLS é texto). Para linhas que não começam com `#` (= URI), encodar e substituir. Para tags como `#EXT-X-MAP:URI="..."` também reescrever.
- **Cache**: `cache-control: max-age=1` no playlist (live), `max-age=60` nos segmentos.
- **Segurança**: allowlist de hosts upstream; sem repasse de headers do cliente (exceto `Range`); sem cookies.
- **Sem segredos**: proxy é puramente público (HLS já é público no upstream).

## Diagrama

```text
Browser (viax.lovable.app)
   └─ hls.js → GET /api/public/hls-proxy/motiva-br116-km225/index.m3u8
                 └─ Worker fetch (Origin: motiva) → CloudFront
                       ← .m3u8 reescrito (segments → /seg?u=...)
                 └─ hls.js pede segmentos → /seg?u=... → Worker → CloudFront → mp4
```

## Fora de escopo

- Não vou tocar no player (`camera-player.tsx`) — já está OK depois do fix anti-loop.
- Não vou criar UI de admin para gerenciar o mapa de upstream (hardcoded por enquanto; 2 câmeras só).
- Não vou migrar a câmera SP-055 existente para o proxy a menos que você peça (ela funciona direto hoje).
