# ViaX — Urban Pulse Exchange

Plataforma de mercados de previsão urbana (trânsito), futebol 1X2 e mercados comunitários. Stack: **TanStack Start** (React), **Supabase** (Postgres + Auth), **Cloudflare Workers**.

## Pré-requisitos

- Node.js 22+
- Conta Supabase (projeto linkado via CLI)
- Wrangler (deploy Cloudflare)

## Setup local

```bash
npm ci
cp .env.example .env.local   # preencher VITE_SUPABASE_*
npm run dev
```

App em `http://localhost:5173`.

### Supabase

```bash
npm run db:start      # stack local (opcional)
npm run db:push       # aplicar migrations no remoto
npm run db:types      # regenerar types TypeScript
```

Documentação: [`docs/AUTH.md`](docs/AUTH.md), [`docs/FOOTBALL.md`](docs/FOOTBALL.md), [`docs/COMMUNITY_MARKETS.md`](docs/COMMUNITY_MARKETS.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/SLOS.md`](docs/SLOS.md), [`docs/DB_GOVERNANCE.md`](docs/DB_GOVERNANCE.md).

## Scripts úteis

| Comando            | Descrição             |
| ------------------ | --------------------- |
| `npm run dev`      | Dev server Vite       |
| `npm run build`    | Build produção        |
| `npm run deploy`   | Build + deploy Worker |
| `npm run lint`     | ESLint                |
| `npm run test`     | Vitest (unit)         |
| `npm run test:e2e` | Playwright            |
| `npm run db:push`  | Migrations → remoto   |

## Rotas principais

| Rota                  | Acesso      | Conteúdo                                       |
| --------------------- | ----------- | ---------------------------------------------- |
| `/markets`            | Público     | Hub: Trânsito · Futebol · Outros (`?segment=`) |
| `/football/$marketId` | Público     | Detalhe jogo 1X2                               |
| `/live`               | Público     | Mapa ao vivo                                   |
| `/ranking`            | Público     | Leaderboards                                   |
| `/dashboard`          | Autenticado | Terminal do trader                             |
| `/admin/*`            | Admin       | Painel operacional                             |

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint, testes unitários, build, E2E Playwright e testes SQL opcionais quando `DATABASE_URL` está configurado.

## Deploy

```bash
npm run deploy
```

### Cloudflare Worker (`viax-urban-pulse`)

Secrets obrigatórios para Pix, velocity e webhooks:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VELOCITY_HMAC_SECRET
npx wrangler secret put CRON_HMAC_SECRET
npx wrangler secret put SYNCPAY_WEBHOOK_URL   # https://viax.life/api/public/webhooks/syncpay
# + SYNCPAY_API_KEY ou SYNCPAY_CLIENT_ID/SECRET, SYNCPAY_WEBHOOK_SECRET, API_FOOTBALL_KEY, CRON_SECRET
```

Ver também `docs/SYNCPAY_WITHDRAW.md`, `docs/FOOTBALL.md`, `docs/SECURITY.md`.

### Lovable Cloud (`https://viax.life`)

O domínio de produção é servido pelo **Lovable Cloud** (não pelo `workers.dev` direto). Configure as **mesmas** variáveis acima em **Project → Cloud → Environment variables** no painel Lovable, incluindo `SUPABASE_SERVICE_ROLE_KEY` e `VELOCITY_HMAC_SECRET`. Sem isso, depósito Pix falha com *Supabase service role not configured*.

Auth Supabase: `supabase/config.toml` + `npx supabase config push` (Site URL `https://viax.life`).

Webhook SyncPay: registrar `https://viax.life/api/public/webhooks/syncpay` no painel SyncPay.
