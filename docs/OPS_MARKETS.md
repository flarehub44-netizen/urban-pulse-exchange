# Ops — Mercados demo e lifecycle

## Jobs pg_cron (Supabase)

| Job                         | Schedule    | Função                                                                 |
| --------------------------- | ----------- | ---------------------------------------------------------------------- |
| `viax-lifecycle`            | cada minuto | `tick_market_lifecycle()` — closing → closed → settled                 |
| `viax-traffic-slots`        | cada minuto | `tick_traffic_slots()` — spawn de 1 slot de trânsito (após lifecycle) |
| `viax-refresh-demo-markets` | a cada 6h   | `refresh_demo_live_markets()` — **no-op** (legado `*-live` desativado) |

**Trânsito em slots:** 1 mercado `is_traffic_slot` ao vivo por vez, duração padrão 1 min, próximo slot 15 min após o fim. Templates em `traffic_event_templates` (`ready=true` após teste no admin). Catálogo: `/admin/traffic-events`.

Ver também [RESOLUTION_ENGINE.md](./RESOLUTION_ENGINE.md).

## Comandos manuais

```bash
# Lifecycle (smoke)
npm run db:tick -- "select public.tick_market_lifecycle();"

# Scheduler de slots de trânsito
npm run db:tick -- "select public.tick_traffic_slots();"

# Estado público (hero / countdown / últimos encerrados)
npm run db:tick -- "select public.get_traffic_public_state();"

# Refresh mercados demo (legado — não cria mais *-live)
npm run db:tick -- "select public.refresh_demo_live_markets();"
```

## E2E / QA

Trânsito usa **1 slot ao vivo** (não mais 3+ mercados `*-live` em paralelo):

```bash
npm run test:e2e:install
$env:PLAYWRIGHT_BASE_URL="https://viax-urban-pulse.douglaspinheirosantos94.workers.dev"
$env:PLAYWRIGHT_MIN_LIVE="1"
npm run test:e2e
```

Preview local (slot ativo ou countdown no DB linked):

```bash
npm run preview
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
$env:PLAYWRIGHT_MIN_LIVE="1"
npm run test:e2e
```

## Deploy

```bash
npm run db:push
npm run deploy
```
