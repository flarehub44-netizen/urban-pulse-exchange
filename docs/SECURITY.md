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

| Header / dado                          | Risco                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apikey` (JWT com `"role":"anon"`)     | **Público por design** — vai no bundle (`VITE_SUPABASE_PUBLISHABLE_KEY`). Proteção = RLS + RPC, não esconder.              |
| `authorization: Bearer …`              | **Sessão do usuário** — visível só no _seu_ DevTools; se vazar (print, XSS), outra pessoa pode agir como você até expirar. |
| `sb-project-ref`, URL do projeto       | Não são segredos.                                                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY` no Network | **Nunca** deve aparecer — só no Worker/servidor.                                                                           |

O app valida em runtime que a chave publicável não é `service_role` (`src/lib/supabase-key-guard.ts`).

**Checklist local:** `npm run check:secrets` (imports e `SERVICE_ROLE` no `src/`). Após build opcional: `node scripts/check-client-bundle-secrets.mjs dist/client`.

**Supabase Advisors:** Dashboard → Database → Advisors (security) ou MCP `get_advisors` (tipo `security`) após cada migration. WARNs em `authenticated_security_definer_function_executable` em RPCs user-facing (`place_bet`, `create_league`, etc.) são **esperados** — o modelo ViaX usa `SECURITY DEFINER` + allowlist. O alvo é **0** em `anon_security_definer_function_executable`.

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

### Grants `EXECUTE` em RPCs (default-deny)

A migration `20260826020000_harden_rpc_execute_and_search_path.sql` revoga `EXECUTE` de todas as funções `SECURITY DEFINER` e só reconcede uma allowlist de RPCs de usuário final. A remediation `20261108000000_security_advisor_remediation.sql` estende a allowlist (ligas P1/P2, `place_outcome_bet`, etc.) e fecha regressões de `anon`.

**Padrão obrigatório em toda RPC nova:**

```sql
revoke execute on function public.foo(...) from public, anon, authenticated;
grant execute on function public.foo(...) to service_role;
-- se user-facing:
grant execute on function public.foo(...) to authenticated;
```

**Regras:**

1. RPCs `admin_*`, `get_admin_*`, `cron_*`, `_*` e workers internos: **somente** `service_role` (BFF em `src/actions/admin/*` com service key). Ver `20261009120000_admin_rpc_server_only.sql`.
2. HTTP **403** em `/rest/v1/rpc/admin_*` pelo browser é esperado — admin passa pelo BFF.
3. Validação local: `npm run check:security-grants` (REVOKE antes de GRANT em migrations ≥ 20261101) e `npm run check:admin-rpc` (sem chamada direta de admin RPC no browser).
4. Validação remota (SQL): `supabase/tests/security_anon_execute_must_be_zero.sql` — `anon_count` deve ser **0**.
5. Pós-migration: MCP `get_advisors` security; esperar 0× `anon_security_definer`, queda em `function_search_path_mutable` e `rls_enabled_no_policy` nas partições `camera_metrics_*`.

## Funções `SECURITY DEFINER`

- `REVOKE` de `PUBLIC` em todas as funções `public` (`20260717000002_revoke_public_function_execute.sql`).
- Grants explícitos `authenticated` / `service_role` nas migrations de feature (nunca `anon` em definer, salvo RPCs públicas documentadas na allowlist).
- Inventário anon: `supabase/tests/security_anon_functions_inventory.sql`.
- Gate CI anon = 0: `supabase/tests/security_anon_execute_must_be_zero.sql`.
- Inventário `SECURITY DEFINER` sem `search_path`: `supabase/tests/security_definer_search_path_inventory.sql`.

## Auth — Leaked Password Protection (HIBP)

Ativar manualmente no dashboard Supabase do projeto: **Authentication → Settings → Password Security → Leaked password protection**. Não é configurável via migration. O Security Advisor emite `auth_leaked_password_protection` até estar ativo.

## Checklist pós-alteração de schema

1. `alter table ... enable row level security` em tabelas novas.
2. Políticas mínimas (deny-by-default no Postgres 15+ com RLS). Partições criadas por `ensure_monthly_partition` em `camera_metrics_*` recebem `camera_metrics_deny_all` automaticamente.
3. Toda RPC nova: bloco default-deny (ver acima) + entrada na allowlist se user-facing.
4. `npm run db:types` e revisar chamadas `.from()` no `src/`.
5. `npm run check:security-grants` e `npm run check:admin-rpc`.
6. Testes SQL em `supabase/tests/` quando tocar resolução ou apostas.
7. MCP `get_advisors` (security) ou Dashboard → Advisors.

## KYC saque (cross-CPF)

- Gate V08 em `request_withdrawal`: limite cumulativo de **R$ 100/mês por documento** (hash CPF), não apenas por `user_id`.
- Migration: `20260910120000_kyc_cross_cpf_withdrawal_gate.sql`.

## Velocity e cluster sweep

- `security_velocity_events` + `service_assert_velocity_limit` (migration `20260910130000`).
- BFF: `src/lib/velocity.server.ts` — env `VELOCITY_HMAC_SECRET`.
- Cron: `POST /api/public/cron/fraud-cluster-sweep` — `service_fraud_cluster_sweep` (dry-run via `fraud_cluster_sweep_dry_run`).
- Cloudflare: ver `docs/CLOUDFLARE_WAF.md`.

## Admin MFA

- `assert_admin_mfa()` quando `platform_settings.admin_mfa_required = true`.
- Enrollment: painel em `/admin/system`.

## Rate limiting (edge)

- `/api/public/webhooks/syncpay`: janela curta por IP + assinatura obrigatória.
- `/api/public/cron/football-*`: `CRON_SECRET` + rate limit por IP.
- `/api/public/cron/impact-xp-credit`: processa fila de XP de impacto (6h pós-settle); `CRON_SECRET` + rate limit.
- `/api/public/cron/impact-monthly-finalize`: fecha Top 3 mensal e notifica vencedores; agendar dia 1 ~00:15 BRT.
- `/api/public/hls-proxy/*` e `/api/public/snapshot-proxy/*`: rate limit por IP para reduzir abuso.

## Governança SQL

Checklist e processo de revisão contínua em [`DB_GOVERNANCE.md`](./DB_GOVERNANCE.md).
