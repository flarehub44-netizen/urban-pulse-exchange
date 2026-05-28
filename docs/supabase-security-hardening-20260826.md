# Supabase Security Hardening (2026-08-26)

## Escopo aplicado

- Migration aplicada: `supabase/migrations/20260826020000_harden_rpc_execute_and_search_path.sql`.
- Objetivo: reduzir superfície de execução de RPCs `SECURITY DEFINER` e eliminar `search_path` mutável nas funções críticas.

## Decisões implementadas

- **Default deny para RPC `SECURITY DEFINER` em `public`:**
  - `REVOKE EXECUTE` de `public`, `anon` e `authenticated`.
  - `GRANT EXECUTE` para `service_role` por padrão.
- **Allowlist explícita para `authenticated`:**
  - Reabertas apenas RPCs de produto necessárias ao fluxo de usuário.
  - RPCs administrativas/internas ficaram bloqueadas para `authenticated`.
- **`search_path` mutável:**
  - Ajustado para `public` nas funções:
    - `normalize_cpf_digits`
    - `is_valid_cpf`
    - `hash_cpf_document`
    - `syncpay_extract_payer_document`
    - `partner_cpa_withdrawable_at`
- **`pg_net` fora de `public`:**
  - Tentativa feita via `ALTER EXTENSION ... SET SCHEMA extensions`.
  - Ambiente remoto retornou limitação de plataforma (`feature_not_supported`), com fallback não destrutivo.

## Validação executada

- `npm run db:push` executado com sucesso.
- `npx supabase db advisors --linked --type security --output-format json --level warn` executado.
- Testes de regressão direcionados:
  - `npm run test -- src/actions/bets.test.ts src/lib/cron-auth.server.test.ts` (passando).

## Estado pós-hardening (segurança)

- `function_search_path_mutable`: `0`.
- `anon_security_definer_function_executable`: `0`.
- `authenticated_security_definer_function_executable`: ainda há ocorrências para funções de usuário que permanecem `SECURITY DEFINER` por design atual.
- `extension_in_public`: `pg_net` permanece em `public` por restrição do ambiente.

## Fase 2 - Lote 1 (aplicado)

- Migration aplicada: `supabase/migrations/20260826030000_reduce_authenticated_definer_surface.sql`.
- Estratégia: remover `EXECUTE` de `authenticated` apenas em funções internas (cron/infra/helpers) e manter `service_role`.
- Funções ajustadas:
  - `assert_user_account_active`
  - `apply_user_progress`
  - `check_user_achievements`
  - `is_admin`
  - `upsert_football_fixture` (assinaturas existentes)
  - `cron_close_football_bets`
  - `list_football_markets_for_resolve`
  - `resolve_football_fixture`
- Resultado:
  - `authenticated_security_definer_function_executable`: **89 -> 82** (redução de 7 ocorrências) após novo `advisors`.

## Fase 2 - Lote 2 (aplicado)

- Migration aplicada: `supabase/migrations/20260826040000_reduce_authenticated_definer_surface_lot2.sql`.
- Estratégia: retirar `authenticated` de helpers internos não chamados diretamente pelo cliente.
- Funções ajustadas:
  - `is_football_enabled`
  - `get_camera_region_raw`
  - `get_camera_upstream`
  - `resolve_partner_slug`
- Resultado:
  - `authenticated_security_definer_function_executable`: **82 -> 78** (redução adicional de 4 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 78**.

## Fase 2 - Lote 3 (aplicado)

- Migration aplicada: `supabase/migrations/20260826050000_reduce_authenticated_definer_surface_lot3.sql`.
- Estratégia: remover `authenticated` de funções sem uso direto no frontend atual (fora tipos gerados).
- Funções ajustadas:
  - `claim_sub_partner_invite`
  - `get_my_partner_status`
  - `get_today_poll`
  - `is_current_user_admin`
- Resultado:
  - `authenticated_security_definer_function_executable`: **78 -> 74** (redução adicional de 4 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 74**.

## Fase 2 - Lote 4 (aplicado)

- Migration aplicada: `supabase/migrations/20260826060000_convert_safe_rpcs_to_security_invoker_lot4.sql`.
- Estratégia: converter para `SECURITY INVOKER` apenas RPCs user-scoped com RLS de ownership já validada.
- Funções convertidas:
  - `get_following_trader_ids`
  - `get_recent_near_miss`
- Evidência de segurança:
  - `trader_follows` possui policy `SELECT` para `authenticated` com `auth.uid() = follower_id`.
  - `user_near_miss_events` possui policy `SELECT` com `auth.uid() = user_id`.
- Resultado:
  - `authenticated_security_definer_function_executable`: **74 -> 72** (redução adicional de 2 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 72**.

## Fase 2 - Lote 5 (aplicado)

- Migration aplicada: `supabase/migrations/20260826070000_convert_safe_rpcs_to_security_invoker_lot5.sql`.
- Estratégia: converter RPCs centradas no usuário para `SECURITY INVOKER` quando as tabelas base já possuem RLS de ownership.
- Funções convertidas:
  - `toggle_trader_follow`
  - `user_has_deposited`
  - `get_my_leagues`
  - `list_my_community_markets`
- Evidência de segurança:
  - `trader_follows`: policies de `SELECT/INSERT/DELETE` com escopo do `auth.uid()`.
  - `profiles` e `transactions`: policies `read_own`.
  - `leagues` e `league_members`: policies de membership/ownership.
  - `markets` e `market_access`: policies que limitam leitura por visibilidade/ownership/acesso.
- Resultado:
  - `authenticated_security_definer_function_executable`: **72 -> 68** (redução adicional de 4 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 68**.

## Fase 2 - Lote 6 (aplicado)

- Migration aplicada: `supabase/migrations/20260826080000_convert_safe_read_rpcs_to_security_invoker_lot6.sql`.
- Estratégia: converter RPCs de leitura para `SECURITY INVOKER` quando a leitura já é coberta por RLS/policies de `authenticated`.
- Funções convertidas:
  - `get_active_events`
  - `search_markets`
  - `list_traffic_ended_markets`
- Evidência de segurança:
  - `platform_events`: policy `events_select` com leitura permitida.
  - `markets`: policy `markets_read_all` para `authenticated`.
  - `market_resolutions`: policy `market_resolutions_read_authenticated`.
- Resultado:
  - `authenticated_security_definer_function_executable`: **68 -> 65** (redução adicional de 3 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 65**.

## Fase 2 - Lote 7 (aplicado)

- Migration aplicada: `supabase/migrations/20260826090000_convert_retention_rpcs_with_rls_adjustments_lot7.sql`.
- Estratégia: converter RPCs user-scoped com pequeno ajuste de RLS nas tabelas de catálogo e de tracking.
- Ajustes de policy:
  - `daily_missions_read_authenticated` em `public.daily_missions`.
  - `achievements_read_authenticated` em `public.achievements`.
  - `market_views_update_own` em `public.market_views`.
- Funções convertidas:
  - `get_daily_missions`
  - `get_user_achievements`
  - `record_market_view`
- Resultado:
  - `authenticated_security_definer_function_executable`: **65 -> 62** (redução adicional de 3 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 62**.

## Fase 2 - Lote 8 (aplicado)

- Migration aplicada: `supabase/migrations/20260826100000_convert_public_read_rpcs_with_rls_adjustments_lot8.sql`.
- Estratégia: converter RPCs de leitura pública/autenticada com ajuste mínimo de policy.
- Ajuste de policy:
  - `traffic_scheduler_read_authenticated` em `public.traffic_scheduler`.
- Funções convertidas:
  - `get_traffic_public_state`
  - `list_public_community_markets`
- Resultado:
  - `authenticated_security_definer_function_executable`: **62 -> 60** (redução adicional de 2 ocorrências).
  - Acumulado da fase 2 até agora: **89 -> 60**.

## Fechamento atual e exceções

- Inventário atualizado confirma que os **60 remanescentes** estão em uso no app e concentram-se em três grupos:
  1. **Fluxos financeiros/settlement** (exigem bypass controlado de RLS e atomicidade transacional).
  2. **Fluxos com leitura cruzada entre usuários** (ex.: social proof/feed/public trader) onde RLS atual é estritamente `own`.
  3. **Fluxos administrativos/client-admin** com validação in-function (`assert_admin`) mas executados por sessão autenticada.
- Para esses grupos, a permanência temporária em `SECURITY DEFINER` está condicionada a:
  - validação explícita de identidade/role dentro da função;
  - `search_path` fixo;
  - grants mínimos por role;
  - migração gradual para canal server-only quando aplicável.

## CPF HMAC secret (`platform_settings`)

- `hash_cpf_document` lê o secret da chave `cpf_hmac_secret` em `public.platform_settings` (migration `20260827040000_cpf_hmac_secret_platform_settings.sql`).
- **Não** usar `ALTER DATABASE ... SET app.cpf_hmac_secret` no Supabase hospedado (erro `42501`).
- **Não** expor via `admin_update_setting` (evita vazar o secret no audit log).
- Configuração recomendada (SQL Editor):

```sql
insert into public.platform_settings (key, value)
values ('cpf_hmac_secret', to_jsonb('<64-char-random-secret>'::text))
on conflict (key) do update
  set value = excluded.value,
      updated_at = now();
```

- Validação:

```sql
select public.hash_cpf_document('12345678909');
```

## Critério de conclusão (estado atual)

- `function_search_path_mutable`: `0`.
- `anon_security_definer_function_executable`: `0`.
- `authenticated_security_definer_function_executable`: **60** (baseline 89).
- Regressão crítica: testes direcionados passando (`bets` + `cron-auth`).
- Próximo marco de encerramento: reduzir remanescentes por domínio (financeiro/admin/social) com plano de exceções assinadas para as funções que não puderem migrar sem redesign.

## Backlog fase 2 (recomendado)

1. Migrar RPCs de usuário de `SECURITY DEFINER` para `SECURITY INVOKER` com políticas RLS adequadas.
2. Mover funções internas para schema não exposto e manter `public` apenas com API mínima.
3. Retirar dependência de `pg_net` no `public` quando a plataforma permitir, ou encapsular uso em camada interna.
4. Revisar endpoints admin para canal server-only (edge/service) em vez de chamadas diretas do cliente.
