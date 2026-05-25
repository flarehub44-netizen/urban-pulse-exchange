# Mercados de futebol (1X2)

## Fluxo

1. **Sync** (`runFootballSync`) busca jogos na [API-Football v3](https://www.api-football.io/) e grava em `football_fixtures` com `review_status = pending_review`.
2. **Admin** em `/admin/football` aprova o jogo → mercado em `draft` → publica → `live`.
3. **Usuários** veem jogos em `/markets?segment=futebol` e apostam no detalhe `/football/{marketId}` (Casa / Empate / Fora).
4. **Resolve** (`runFootballResolve`) liquida mercados quando o jogo termina (`FT`, `AET`, `PEN`).

## Variáveis de ambiente (servidor / Cloudflare)

| Variável                    | Obrigatório | Uso                                       |
| --------------------------- | ----------- | ----------------------------------------- |
| `API_FOOTBALL_KEY`          | Sim (sync)  | Header `x-apisports-key`                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim (cron)  | RPCs de sync/resolve                      |
| `CRON_SECRET`               | Opcional    | Protege rotas HTTP `/api/cron/football-*` |

```bash
npx wrangler secret put API_FOOTBALL_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put CRON_SECRET
```

## Deploy e smoke manual (checklist)

Use este roteiro após `npm run build` e deploy do Worker (`npx wrangler deploy`).

### 1. Secrets

- [ ] `API_FOOTBALL_KEY` configurada no Worker
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurada no Worker
- [ ] `CRON_SECRET` (se usar rotas HTTP de cron)

### 2. Sync

- [ ] Admin → `/admin/football` → **Configuração** → **Sincronizar API agora**
- [ ] Aba **Pendentes** mostra jogos com `pending_review` (liga 71 ou IDs em `football_league_ids`)

### 3. Publicação

- [ ] **Aprovar** um jogo → aparece em **Rascunhos**
- [ ] **Publicar** → mercado em **Publicados** e visível em `/markets?segment=futebol` (redirect de `/football`)

### 4. Aposta

- [ ] Usuário autenticado abre `/football/{marketId}` e confirma previsão 1X2
- [ ] Pool atualiza (realtime em `football_markets`)

### 5. Liquidação

- [ ] Após status `FT` na API (ou fixture de teste com gols), **Liquidar jogos finalizados** ou aguardar cron `*/5`
- [ ] Vencedores creditados; notificação abre `/football/fb-...` (não `/markets/...`)

### Seed local / E2E

Mercado `fb-999999001` (São Paulo x Corinthians, `live`) — migration `20260701000000_football_markets.sql`.

## Cron

- **Cloudflare Worker** (`wrangler.jsonc`): `*/30` sync, `*/5` resolve — handler `scheduled` em `src/server.ts`.
- **HTTP** (alternativa): `GET /api/cron/football-sync` e `/api/cron/football-resolve` com `Authorization: Bearer $CRON_SECRET`.
- **Admin manual**: abas em `/admin/football` — Sincronizar / Liquidar na Configuração.

## Configuração (`platform_settings`)

| Chave                            | Descrição                                             |
| -------------------------------- | ----------------------------------------------------- |
| `football_enabled`               | Liga/desliga módulo                                   |
| `football_league_ids`            | ex.: `[71, 2, 39]`                                    |
| `football_sync_days_ahead`       | padrão `7`                                            |
| `football_betting_close_minutes` | padrão `5`                                            |
| `football_regulation`            | `90min` (placar HT na API) ou outro (placar final FT) |

## Testes

```bash
npm run test
npm run build
npm run test:e2e -- e2e/football-bet.spec.ts e2e/football-admin.spec.ts

# SQL acceptance (CI com DATABASE_URL)
psql "$DATABASE_URL" -f supabase/tests/football_markets_acceptance.sql
```

O script SQL executa validações de pool/outcome em transação com rollback e, em seguida, `football_run_acceptance_flow()` (aposta + resolve + payout).

## Admin — abas

- **Pendentes** — aprovar / rejeitar fixtures da API
- **Rascunhos** — publicar mercado
- **Publicados** — mercados live/closed/settled; **Anular** (void + reembolso)
- **Configuração** — ligas, sync manual, liquidação manual
