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

Documentação: [`docs/AUTH.md`](docs/AUTH.md), [`docs/FOOTBALL.md`](docs/FOOTBALL.md), [`docs/COMMUNITY_MARKETS.md`](docs/COMMUNITY_MARKETS.md).

## Scripts úteis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server Vite |
| `npm run build` | Build produção |
| `npm run deploy` | Build + deploy Worker |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (unit) |
| `npm run test:e2e` | Playwright |
| `npm run db:push` | Migrations → remoto |

## Rotas principais

| Rota | Acesso | Conteúdo |
|------|--------|----------|
| `/markets` | Público | Hub: Trânsito · Futebol · Outros (`?segment=`) |
| `/football/$marketId` | Público | Detalhe jogo 1X2 |
| `/live` | Público | Mapa ao vivo |
| `/ranking` | Público | Leaderboards |
| `/dashboard` | Autenticado | Terminal do trader |
| `/admin/*` | Admin | Painel operacional |

## CI

GitHub Actions (`.github/workflows/ci.yml`): lint, testes unitários, build, E2E Playwright e testes SQL opcionais quando `DATABASE_URL` está configurado.

## Deploy

```bash
npm run deploy
```

Secrets no Cloudflare: `SUPABASE_*`, `API_FOOTBALL_KEY` (futebol), etc. Ver `docs/FOOTBALL.md` e `docs/OPS_MARKETS.md`.
