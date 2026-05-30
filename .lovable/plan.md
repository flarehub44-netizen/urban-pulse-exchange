# Endurecimento de Segurança ViaX

Tudo será aplicado em **uma única migration** (mais um toggle manual no painel Auth e edits mínimos no frontend onde a leitura mudar de tabela para view).

---

## Bloco 🔴 — Risco financeiro/dados sensíveis

### 1. `profiles` — travar campos compliance no UPDATE
Estender o trigger `profiles_guard_sensitive` (já bloqueia `is_admin`, `balance`) para também rejeitar mudança self-service em:
- `kyc_status` (antifraude — só admin/service_role muda)
- `cpf` (imutável pós-cadastro)
- `recovery_mode` (controlado por `activate_recovery_mode`)
- `banned_at`, `ban_reason` (só admin)

Comportamento: o trigger compara `OLD.x IS DISTINCT FROM NEW.x` e ignora a mudança quando `auth.role() <> 'service_role'`. Sem alteração de RLS — política `profiles_update_own` continua.

### 2. `oracle_snapshots` — fechar leitura pré-resolução
Drop da policy `oracle_snapshots_read_authenticated` (libera tudo). Substituir por:
- `oracle_snapshots_admin_read` → `is_current_user_admin()`
- `oracle_snapshots_read_resolved` → autenticado lê **só** se `EXISTS (markets m WHERE m.id = market_id AND m.status = 'resolved')`

Elimina front-running antes do settlement.

### 3. `football_market_resolutions` — esconder cálculo interno
Drop da policy `football_resolutions_read` (autenticado vê tudo). Criar:
- View `public.football_market_resolutions_public` projetando apenas `id`, `market_id`, `status`, `winning_outcome`, `goals_home`, `goals_away`, `created_at` (sem `payout_summary`, `inputs`, `source`)
- `GRANT SELECT ON football_market_resolutions_public TO anon, authenticated`
- Tabela base passa a ter policy `admin_only`

---

## Bloco 🟡 — Vazamento de metadados

### 4. `football_fixtures.raw_payload` — projeção via view
Drop `football_fixtures_read_approved`. Criar:
- View `public.football_fixtures_public` sem `raw_payload`, `reviewed_by`, `reviewed_at`, `reject_reason`, com filtro `review_status = 'approved'`
- `GRANT SELECT TO anon, authenticated`
- Tabela base mantém só a policy admin

Frontend: atualizar chamadas `.from('football_fixtures')` para `.from('football_fixtures_public')` quando o request é público.

### 5. `monthly_impact_winners` — esconder fulfillment
View `public.monthly_impact_winners_public` projetando só `rank`, `period_month`, `user_id`, `prize_label`, `xp_total`. Esconde `fulfilled_by`, `fulfilled_at`, `notes`. Frontend continua usando a RPC admin para a parte interna.

---

## Bloco 🟢 — Higiene

### 6. `pg_net` em schema `public`
`ALTER EXTENSION pg_net SET SCHEMA extensions` (extensão `extensions` já criada). Ajustar referências (todos os cron jobs chamam `net.http_post` mas o resolver vai usar o schema novo automaticamente desde que `extensions` esteja em `search_path` — confirmar e adicionar à role `postgres` se necessário).

### 7. SECURITY DEFINER executável por anon — REVOKE em massa
12 funções com `EXECUTE` para anon que não deveriam ter:
```
admin_get_cpf_velocity_report, admin_list_monthly_impact_winners,
admin_list_payer_document_clusters, admin_mark_impact_prize_fulfilled,
admin_payer_document_cluster, process_syncpay_webhook_event,
service_assert_velocity_limit, service_credit_pending_event_impact_xp,
service_finalize_monthly_impact, service_fraud_cluster_sweep,
service_record_payer_document_event, service_record_velocity_event
```
Aplicar `REVOKE EXECUTE ... FROM PUBLIC, anon` e, para as `service_*`/`process_*`, também `FROM authenticated` (só `service_role` chama).

### 8. SECURITY DEFINER view
A query inicial não achou view definida com `SECURITY DEFINER` no schema `public`. Vou rodar `\dv+` equivalente em build mode para localizar (provavelmente uma view criada via migration antiga). Se confirmado, recriar com `WITH (security_invoker = true)`.

### 9. Leaked Password Protection
Não pode ser ativado via SQL — pedir ao usuário para ativar em **Auth → Policies → Password Protection** no painel Supabase. Vou incluir o link no closing message.

### 10. Função search_path mutável
Pelo levantamento, todas as `SECURITY DEFINER` já têm `SET search_path`. O aviso do linter provavelmente é em funções `SECURITY INVOKER` legadas — vou listar e adicionar `SET search_path = public` em batch.

---

## Detalhes técnicos

**Tabelas tocadas:** `profiles` (trigger), `oracle_snapshots` (policies), `football_market_resolutions` (policies + view), `football_fixtures` (policies + view), `monthly_impact_winners` (policies + view).

**Novas views:** `football_fixtures_public`, `football_market_resolutions_public`, `monthly_impact_winners_public`. Todas com `security_invoker = true` (lê com a permissão do caller) — caller só vê o subset projetado.

**Frontend:** trocar `from('football_fixtures')` → `from('football_fixtures_public')` em rotas/hooks públicos. Hooks admin continuam na tabela base via RPC ou policy admin. Mesmo padrão para `monthly_impact_winners` e `football_market_resolutions` se houver leitura direta no client (verificar `src/hooks/*` em build mode).

**Migrations vs config:** tudo numa migration SQL; o único item manual é o toggle no painel Auth (item 9).

**Falsos positivos ignorados:**
- 270× `RLS Enabled No Policy` (INFO) — partições filhas de `market_history`/`camera_metrics` herdam policy do pai.

---

## Ordem de execução

1. Migration única com itens 1-8 e 10.
2. Edits no frontend trocando tabelas → views públicas.
3. Mensagem final pedindo ao usuário ativar Leaked Password Protection no painel (item 9).
4. Atualizar `@security-memory` registrando o que ficou intencionalmente público (views projetadas) e o modelo de acesso.
