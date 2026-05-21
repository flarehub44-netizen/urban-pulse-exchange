# Motor de Resolução ViaX

## Deploy

```bash
npm run db:push
```

Migrations: `20260522000000`–`20260524000002` (engine, ledger, gaps, security, oracle ops, wallet RPC).

## pg_cron

O job `viax-lifecycle` roda a cada minuto e chama `tick_market_lifecycle()`:

1. `ingest_oracle_snapshots` — grava leituras em `oracle_snapshots`
2. Promove `live` → `closing` (30 min antes do fim)
3. Promove `live`/`closing` → `closed` após `ends_at`
4. Resolve `closed` → oráculo → `settled` | `dispute` | `void`

Confirme em **Supabase Dashboard → Database → Extensions → pg_cron** e em `cron.job`.

Teste manual:

```bash
npm run db:tick -- "select public.tick_market_lifecycle();"
```

## Estados

`draft` → `live` → `closing` → `closed` → `resolving` → `settled` | `dispute` | `void`

- **draft**: `create_market` (admin); `open_market` abre para apostas
- **dispute**: `admin_resolve_market` na UI (Configurações, admins `mc_oracle` / `lucasalpha`)

## Auditoria

Aba **Auditoria** no detalhe do mercado → RPC `get_market_audit` (ledger da casa só para admins).

## Segurança

- Trigger `profiles_guard_sensitive` impede alterar `is_admin`, `balance` e stats via cliente.
- Admin: apenas perfis com `is_admin = true` (seed); use `service_role` para promoções.

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
