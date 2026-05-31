# Motor de Resolução ViaX

## Deploy

```bash
npm run db:push
```

Migrations: `20260522000000`–`20260525000001` (engine, ledger, security, oracle ops, admin bootstrap, catalog archive).

## pg_cron

O job `viax-lifecycle` roda a cada minuto e chama `tick_market_lifecycle()`:

1. Promove `live` → `closing` (30 min antes do fim)
2. Promove `live`/`closing` → `closed` após `ends_at`
3. Resolve `closed` → `process_market_resolution()` → oráculo → `settled` | `dispute` | `void`

Mercados de **futebol** seguem pipeline próprio: cron `/api/public/cron/football-resolve` →
`resolve_football_fixture()` (API-Sports) → `settle_football_market()` ou
`refund_football_market()`. Mercados de **comunidade** são resolvidos pelo criador via
`resolve_community_market()` após `ends_at`.

## Pagamento ao vencedor (parimutuel)

- Casa retém 10% (`HOUSE_RETENTION`); 90% (`PRIZE_RATIO`) viram prêmio.
- `payout = (stake / pool_vencedor) × (pool_total × 0.9)`.
- `settle_market` / `settle_football_market` rodam em transação única:
  atualizam `bets.payout`, `profiles.balance`, `profiles.pnl`, inserem em
  `transactions` (`payout`), `notifications` (`win`) e `platform_ledger` (`house_fee`).
- Void (lado minoritário < 5% — `MIN_MINORITY_RATIO`, ou pool vencedor = 0):
  `refund_market` / `refund_football_market` devolvem o stake integral.

Confirme em **Supabase Dashboard → Database → Extensions → pg_cron** e em `cron.job`.

Mercados demo (`*-live`): job `viax-refresh-demo-markets` (6h) — ver [OPS_MARKETS.md](./OPS_MARKETS.md).

Teste manual:

```bash
npm run db:tick -- "select public.tick_market_lifecycle();"
```

## Estados

`draft` → `live` → `closing` → `closed` → `resolving` → `settled` | `dispute` | `void`

- **draft**: `create_market` (admin); `open_market` abre para apostas
- **dispute**: `admin_resolve_market` na UI (Configurações, usuário com `is_admin`)

## Auditoria

Aba **Auditoria** no detalhe do mercado → RPC `get_market_audit` (ledger da casa só para admins).

## Segurança

- Trigger `profiles_guard_sensitive` impede alterar `is_admin`, `balance` e stats via cliente.
- **Virar operador (admin):**
  1. **Convite (recomendado):** em Configurações, informe o código de uso único (seed: `VIAX-OPS-2026` em dev — rotacionar em produção via SQL).
  2. **Allowlist por e-mail:** inserir em `admin_allowlist` com `service_role`, vincular e-mail no perfil, clicar “Sincronizar e-mail”.
  3. **SQL manual:** `update public.profiles set is_admin = true where id = '<seu-auth-uuid>';` (Dashboard → Authentication → Users).
- Perfis seed (`10000000-...`) **não** são admin após migration `20260525000000`.

## Observabilidade

- Tabela `lifecycle_tick_runs` — um registro por execução do cron.
- RPC `get_lifecycle_health()` (admin) na aba Configurações.
- `open_market` grava 3 `oracle_snapshots` iniciais para evitar disputa por janela vazia.

## Carteira demo

- `wallet_deposit` / `wallet_withdraw` — abas Depositar/Sacar na UI.

## Testes

```bash
npm run test
npm run db:types   # gera types.generated.ts (opcional)
```

SQL (dev): `supabase/tests/resolution_engine_acceptance.sql` ou `npm run db:test-sql` com `DATABASE_URL`.

CI: job opcional roda acceptance se `secrets.DATABASE_URL` estiver configurado.
