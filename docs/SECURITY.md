# Segurança — ViaX

## Variáveis de ambiente

| Variável                        | Onde                 | Obrigatória      |
| ------------------------------- | -------------------- | ---------------- |
| `VITE_SUPABASE_URL`             | Build cliente        | Sim (dev/CI)     |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Build cliente (anon) | Sim              |
| `SUPABASE_URL`                  | Worker SSR           | Sim (deploy)     |
| `SUPABASE_PUBLISHABLE_KEY`      | Worker SSR           | Sim              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Worker cron/webhooks | Sim (prod)       |
| `CRON_SECRET`                   | `/api/cron/*` manual | Recomendado      |
| `API_FOOTBALL_KEY`              | Sync futebol         | Se futebol ativo |

Não commitar chaves reais. Rotacionar anon key no Supabase se o repositório foi público com fallbacks antigos.

## DevTools → Network (é normal?)

Em qualquer app Supabase no browser, ao estar logado você verá:

| Header / dado | Risco |
| ------------- | ----- |
| `apikey` (JWT com `"role":"anon"`) | **Público por design** — vai no bundle (`VITE_SUPABASE_PUBLISHABLE_KEY`). Proteção = RLS + RPC, não esconder. |
| `authorization: Bearer …` | **Sessão do usuário** — visível só no *seu* DevTools; se vazar (print, XSS), outra pessoa pode agir como você até expirar. |
| `sb-project-ref`, URL do projeto | Não são segredos. |
| `SUPABASE_SERVICE_ROLE_KEY` no Network | **Nunca** deve aparecer — só no Worker/servidor. |

O app valida em runtime que a chave publicável não é `service_role` (`src/lib/supabase-key-guard.ts`).

**Checklist local:** `npm run check:secrets` (imports e `SERVICE_ROLE` no `src/`). Após build opcional: `node scripts/check-client-bundle-secrets.mjs dist/client`.

**Supabase Advisors:** no dashboard → Database → Advisors (security). O MCP do projeto pode exigir permissão extra; rode manualmente após migrations.

## RLS — tabelas lidas pelo cliente (`supabase.from`)

Operações sensíveis (apostas, carteira, depósito) devem usar **RPC** ou **serverFn**; `.from()` abaixo depende de políticas RLS.

| Tabela                       | SELECT                                 | INSERT              | UPDATE                   | DELETE | Notas                                                               |
| ---------------------------- | -------------------------------------- | ------------------- | ------------------------ | ------ | ------------------------------------------------------------------- |
| `markets`                    | anon + authenticated                   | admin/RPC           | admin/RPC                | admin  | `markets_read_anon`, `markets_read_all`                             |
| `market_history`             | anon + authenticated                   | —                   | —                        | —      | leitura pública                                                     |
| `regions`                    | anon + authenticated                   | —                   | —                        | —      |                                                                     |
| `bets`                       | own (+ público limitado via views/RPC) | via `place_bet` RPC | own note                 | —      | não confiar em insert direto                                        |
| `profiles`                   | own only                               | signup trigger      | own campos não sensíveis | —      | admin via RPC; sem `pix_key` na tabela                              |
| `transactions`               | own                                    | service/RPC         | —                        | —      | callback auth                                                       |
| `notifications`              | own                                    | sistema             | own read                 | —      |                                                                     |
| `feed_posts`                 | público                                | authenticated       | —                        | —      |                                                                     |
| `feed_comments`              | público                                | authenticated       | —                        | —      |                                                                     |
| `leaderboard`                | público                                | —                   | —                        | —      |                                                                     |
| `market_alerts`              | own                                    | own                 | own                      | own    | `user_own_alerts`                                                   |
| `daily_check_ins`            | own                                    | own                 | —                        | —      |                                                                     |
| `trader_follows`             | own/rede                               | own                 | —                        | own    |                                                                     |
| `football_markets`           | público (regras status)                | admin               | admin                    | admin  | apostas via RPC                                                     |
| `football_bets`              | own                                    | RPC                 | —                        | —      |                                                                     |
| `payment_intents`            | own                                    | service             | service                  | —      | `pix_key` = chave saque (RPC) ou metadata depósito; webhook SyncPay |
| `platform_settings`          | leitura flags                          | admin               | admin                    | —      | preferir RPC `is_*_enabled`                                         |
| `daily_polls` / `poll_votes` | público                                | own vote            | —                        | —      |                                                                     |
| `platform_events`            | público                                | admin               | —                        | —      |                                                                     |

## Realtime (`realtime.messages` RLS)

Canais privados (`config: { private: true }`) em `src/hooks/*`. Políticas em `20260717000000_realtime_messages_rls.sql`.

| Tópico                   | Uso                    |
| ------------------------ | ---------------------- |
| `markets-pool`           | pool mercados urbanos  |
| `feed-live`              | feed                   |
| `football-realtime`      | futebol                |
| `markets-lifecycle`      | lifecycle UI           |
| `notifications:{userId}` | notificações (só dono) |
| `win-toast-{userId}`     | toast vitória          |
| `near-miss-{userId}`     | near-miss casino       |

**Regra:** novo `.channel(...)` → adicionar policy + `private: true`. Rodar `node scripts/check-realtime-private-channels.mjs`.

## Admin e dados financeiros

- Painel admin: RPCs (`get_admin_users_list`, etc.), não `SELECT` direto em `profiles`.
- `balance` visível a admin só via RPC; risco de conta admin comprometida mitigado com allowlist + rotação de invites.
- Pix de saque: `payment_intents.pix_key` + `request_withdrawal` RPC; nunca coluna em `profiles`.

### Grants `EXECUTE` em RPCs admin (403 no browser)

A migration `20260826020000_harden_rpc_execute_and_search_path.sql` revoga `EXECUTE` de todas as funções `SECURITY DEFINER` para `authenticated` e só reconcede uma allowlist de RPCs de usuário final. RPCs `admin_*` e `get_admin_*` **não** entram nessa lista.

**Regras:**

1. Toda nova RPC `admin_*` / `get_admin_*` deve incluir `GRANT EXECUTE ... TO authenticated` na **mesma** migration que cria a função (ou na migration de repair `20260830120000_restore_admin_rpc_execute_grants.sql`, que re-concede em lote por prefixo).
2. `GRANT` em migrations antigas **não** sobrevive ao hardening de 26/08 se a função já existia — use a migration de repair ou um novo bloco explícito após criar a RPC.
3. HTTP **403** em `/rest/v1/rpc/get_admin_*` = falta de `EXECUTE` para `authenticated`, **não** “usuário não é admin”. Autorização de negócio continua em `assert_admin()` dentro da função.
4. Validação local: `node scripts/check-admin-rpc-grants.mjs` (RPCs usadas no `src/` vs grants no SQL das migrations).
5. Validação remota (SQL): listar funções `admin_%` / `get_admin_%` sem `has_function_privilege('authenticated', oid, 'EXECUTE')` — resultado esperado: 0 linhas.

## Funções `SECURITY DEFINER`

- `REVOKE` de `PUBLIC` em todas as funções `public` (`20260717000002_revoke_public_function_execute.sql`).
- Grants explícitos `anon` / `authenticated` / `service_role` nas migrations de feature.
- Inventário anon: `supabase/tests/security_anon_functions_inventory.sql`.
- Inventário `SECURITY DEFINER` sem `search_path`: `supabase/tests/security_definer_search_path_inventory.sql`.

## Checklist pós-alteração de schema

1. `alter table ... enable row level security` em tabelas novas.
2. Políticas mínimas (deny-by-default no Postgres 15+ com RLS).
3. `npm run db:types` e revisar chamadas `.from()` no `src/`.
4. Testes SQL em `supabase/tests/` quando tocar resolução ou apostas.

## Rate limiting (edge)

- `/api/public/webhooks/syncpay`: janela curta por IP + assinatura obrigatória.
- `/api/public/cron/football-*`: `CRON_SECRET` + rate limit por IP.
- `/api/public/cron/impact-xp-credit`: processa fila de XP de impacto (6h pós-settle); `CRON_SECRET` + rate limit.
- `/api/public/cron/impact-monthly-finalize`: fecha Top 3 mensal e notifica vencedores; agendar dia 1 ~00:15 BRT.
- `/api/public/hls-proxy/*` e `/api/public/snapshot-proxy/*`: rate limit por IP para reduzir abuso.

## Governança SQL

Checklist e processo de revisão contínua em [`DB_GOVERNANCE.md`](./DB_GOVERNANCE.md).
