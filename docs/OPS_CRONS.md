# Jobs agendados — ViaX

## Política de execução (futebol)

**Produção:** o trigger primário é o handler `scheduled` em [`src/server.ts`](../src/server.ts) (Cloudflare Worker crons em [`wrangler.jsonc`](../wrangler.jsonc)).

As rotas HTTP abaixo existem apenas para **debug/manual** com `Authorization: Bearer $CRON_SECRET`:

| Rota | Método |
|------|--------|
| `/api/public/cron/football-sync` | GET, POST |
| `/api/public/cron/football-resolve` | GET, POST |

Não configure um segundo Cron Trigger HTTP apontando para as mesmas rotas em paralelo ao `scheduled`, para evitar dupla execução.

**Não use `pg_cron` + `pg_net` no Supabase** para chamar `/api/public/cron/football-*` (ex.: SQL do Lovable com URL `*.lovable.app`). Futebol roda só no Worker; jobs Lovable foram removidos em `20260716000000_remove_lovable_football_pg_cron.sql`.

## Inventário

| Job | Frequência | Executor | Código / RPC | Secrets |
|-----|------------|----------|--------------|---------|
| `tick_market_lifecycle` | 1 min | Supabase `pg_cron` | `tick_market_lifecycle()` | — |
| Demo markets refresh | 6 h | Supabase `pg_cron` | ver [OPS_MARKETS.md](./OPS_MARKETS.md) | — |
| Football sync | `*/30 * * * *` | Worker `scheduled` | `runFootballSync()` | `SUPABASE_SERVICE_ROLE_KEY`, `API_FOOTBALL_KEY` |
| Football resolve | `*/5 * * * *` | Worker `scheduled` | `runFootballResolve()` | idem |
| SyncPay webhook | sob demanda | Worker HTTP | `/api/public/webhooks/syncpay` | `SUPABASE_SERVICE_ROLE_KEY`, `SYNCPAY_WEBHOOK_SECRET` |

## Futebol — manual

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<worker-host>/api/public/cron/football-sync
curl -H "Authorization: Bearer $CRON_SECRET" https://<worker-host>/api/public/cron/football-resolve
```

## Mercados urbanos — manual

```bash
npm run db:tick -- "select public.tick_market_lifecycle();"
```

Ver [RESOLUTION_ENGINE.md](./RESOLUTION_ENGINE.md).

## Logs

Jobs de futebol emitem JSON no stdout do Worker (`job`, `durationMs`, `ok`, etc.). Filtrar no dashboard Cloudflare Logs.

## Idempotência

- Futebol: RPCs `upsert_football_fixture`, `resolve_football_fixture` devem ser seguras para reexecução.
- Lifecycle: `lifecycle_tick_runs` registra cada tick Postgres.
- SyncPay: webhook retorna 200 em intents desconhecidos (replay).

## Alertas sugeridos

- Falhas consecutivas em `lifecycle_tick_runs` (Supabase).
- Worker `scheduled` com `ok: false` ou `error` no log JSON.
- `CRON_SECRET` ausente em staging (rotas HTTP retornam 500).
