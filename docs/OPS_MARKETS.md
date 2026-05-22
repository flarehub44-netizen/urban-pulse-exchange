# Ops — Mercados demo e lifecycle

## Jobs pg_cron (Supabase)

| Job | Schedule | Função |
|-----|----------|--------|
| `viax-lifecycle` | cada minuto | `tick_market_lifecycle()` — closing → resolved |
| `viax-refresh-demo-markets` | a cada 6h | `refresh_demo_live_markets()` — reabre `*-live` / backup |

Ver também [RESOLUTION_ENGINE.md](./RESOLUTION_ENGINE.md).

## Comandos manuais

```bash
# Lifecycle (smoke)
npm run db:tick -- "select public.tick_market_lifecycle();"

# Refresh mercados demo (quando /markets?status=live estiver vazio)
npm run db:tick -- "select public.refresh_demo_live_markets();"
```

## E2E / QA

```bash
npm run test:e2e:install
$env:PLAYWRIGHT_BASE_URL="https://viax-urban-pulse.douglaspinheirosantos94.workers.dev"
$env:PLAYWRIGHT_MIN_LIVE="3"
npm run test:e2e
```

Preview local (mínimo 1 mercado no DB linked):

```bash
npm run preview
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:4173"
npm run test:e2e
```

## Deploy

```bash
npm run db:push
npm run deploy
```
