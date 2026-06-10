# Deploy checklist — ViaX

Produção usa **Lovable Cloud** (`https://viax.life`) para SSR e **Cloudflare Worker** (`viax-urban-pulse`) para crons e webhooks. Ambos precisam das mesmas secrets críticas.

## Pré-deploy

```bash
npm run lint
npm run test
npm run check:secrets
npm run check:admin-rpc
npm run check:realtime
npm run build
node scripts/check-deploy-env.mjs .env.local
```

## Variáveis obrigatórias

| Variável                           | Lovable Cloud | Wrangler | Cliente (build)     |
| ---------------------------------- | ------------- | -------- | ------------------- |
| `VITE_SUPABASE_URL`                | —             | —        | Sim                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY`    | —             | —        | Sim                 |
| `SUPABASE_URL`                     | Sim           | Sim      | —                   |
| `SUPABASE_PUBLISHABLE_KEY`         | Sim           | Sim      | —                   |
| `SUPABASE_SERVICE_ROLE_KEY`        | Sim           | Sim      | **Nunca** no client |
| `VELOCITY_HMAC_SECRET`             | Sim           | Sim      | —                   |
| `CRON_SECRET` / `CRON_HMAC_SECRET` | Sim           | Sim      | —                   |
| `SYNCPAY_*`                        | Sim           | Sim      | —                   |
| `API_FOOTBALL_KEY`                 | Se futebol    | Sim      | —                   |

Ver [`.env.example`](../.env.example) e [`README.md`](../README.md).

## Deploy

```bash
npm run db:push          # migrations Supabase
npm run deploy           # Worker (build + wrangler)
# Lovable: push via painel + env vars
```

## Pós-deploy smoke

- [ ] `GET /markets` carrega
- [ ] Login trader OK
- [ ] Admin `/admin` — métricas e saúde operacional
- [ ] `POST /api/public/cron/health-check` com `CRON_SECRET` → `ok: true`
- [ ] Webhook SyncPay registrado: `https://viax.life/api/public/webhooks/syncpay`
- [ ] Depósito Pix teste (R$ 10) em staging

## Runbooks

- Financeiro: [`RUNBOOK_FINANCE.md`](./RUNBOOK_FINANCE.md)
- Crons: [`OPS_CRONS.md`](./OPS_CRONS.md)

## Decisão de runtime (atual)

| Responsabilidade                | Runtime                        |
| ------------------------------- | ------------------------------ |
| SSR + ServerFns BFF             | Lovable Cloud                  |
| Crons (futebol, impact, health) | Cloudflare Worker `scheduled`  |
| Webhooks SyncPay                | Ambos (URL produção → Lovable) |

Unificação em runtime único: backlog pós-90 dias.
