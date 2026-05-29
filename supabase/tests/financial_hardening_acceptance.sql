-- Financial hardening acceptance tests
-- Usage: psql $DATABASE_URL -f supabase/tests/financial_hardening_acceptance.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) distributed rate-limit primitives exist
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'request_rate_limits'
  ), 'request_rate_limits table must exist';

  assert exists (
    select 1
    from pg_proc
    where proname = 'service_assert_rate_limit'
  ), 'service_assert_rate_limit function must exist';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) service_assert_rate_limit blocks on second hit with max=1
-- ---------------------------------------------------------------------------
do $$
declare
  v_first jsonb;
  v_second jsonb;
begin
  v_first := public.service_assert_rate_limit('test:hardening:rate-limit', 1, 60);
  v_second := public.service_assert_rate_limit('test:hardening:rate-limit', 1, 60);

  assert coalesce((v_first->>'limited')::boolean, false) = false,
    'first hit should not be limited';
  assert coalesce((v_second->>'limited')::boolean, false) = true,
    'second hit should be limited';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) place_bet hardening markers are present in function body
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'place_bet'
  limit 1;

  assert v_fn ilike '%idempotency_key_required%',
    'place_bet should require idempotency_key';
  assert v_fn ilike '%pg_advisory_xact_lock%',
    'place_bet should serialize by idempotency key lock';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) webhook hardening markers are present in function body
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'service_process_syncpay_webhook'
  limit 1;

  assert v_fn ilike '%provider_event_id required%',
    'service_process_syncpay_webhook should require provider_event_id';
  assert v_fn not ilike '%md5(coalesce(p_payload::text%',
    'service_process_syncpay_webhook must not dedupe by payload hash fallback';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) Semana 1 / F09: request_withdrawal contains rate limit gate
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'request_withdrawal'
  limit 1;

  assert v_fn is not null,
    'request_withdrawal function must exist';

  assert v_fn ilike '%service_assert_rate_limit%',
    'request_withdrawal must call service_assert_rate_limit (F09)';

  assert v_fn ilike '%withdraw_rpc:%',
    'request_withdrawal rate limit key must be scoped to user (withdraw_rpc:)';

  assert v_fn ilike '%rate_limit_exceeded%',
    'request_withdrawal must raise rate_limit_exceeded exception';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) V07 cumulative KYC gate markers are present in request_withdrawal
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'request_withdrawal'
  limit 1;

  assert v_fn ilike '%v_kyc_month_limit%',
    'request_withdrawal must contain cumulative KYC monthly gate (V07)';

  assert v_fn ilike '%v_monthly_withdrawn%',
    'request_withdrawal must compute v_monthly_withdrawn';

  assert v_fn ilike '%kyc_required_cumulative%',
    'request_withdrawal must raise kyc_required_cumulative exception';

  assert v_fn ilike '%America/Sao_Paulo%',
    'request_withdrawal KYC gate must use Sao_Paulo timezone';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) Semana 2 / F02: hash_cpf_document must not use hardcoded fallback
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'hash_cpf_document'
  limit 1;

  assert v_fn is not null,
    'hash_cpf_document function must exist';

  assert v_fn not ilike '%viax-cpf-sha256-fallback%',
    'hash_cpf_document must not contain the hardcoded fallback secret (F02)';

  assert v_fn ilike '%cpf_hmac_secret_not_configured%',
    'hash_cpf_document must raise cpf_hmac_secret_not_configured when secret is absent (F02)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 8) Semana 2 / F04: guard trigger protects cpf and phone columns
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'guard_profiles_sensitive_columns'
  limit 1;

  assert v_fn ilike '%new.cpf is distinct from old.cpf%',
    'guard_profiles_sensitive_columns must protect the cpf column (F04)';

  assert v_fn ilike '%new.phone is distinct from old.phone%',
    'guard_profiles_sensitive_columns must protect the phone column (F04)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 9) Semana 2 / F04: mask_cpf function exists and is accessible
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'mask_cpf'
  ), 'mask_cpf function must exist';

  -- Structural smoke-test (does not need a real CPF)
  assert public.mask_cpf(null) is null,
    'mask_cpf(null) must return null';
end;
$$;

-- ---------------------------------------------------------------------------
-- 10) Semana 3: new_account_withdrawal alert logic in request_withdrawal
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'request_withdrawal'
  limit 1;

  assert v_fn ilike '%new_account_withdrawal%',
    'request_withdrawal must emit new_account_withdrawal risk alert for young accounts (Semana 3)';

  assert v_fn ilike '%record_user_risk_alert%',
    'request_withdrawal must call record_user_risk_alert';
end;
$$;

-- ---------------------------------------------------------------------------
-- 11) Semana 3 / F11: get_urbanmind_digest defaults to disabled when row absent
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'get_urbanmind_digest'
  limit 1;

  -- The gate must default to false (fail-closed), not true
  assert v_fn ilike '%coalesce(v_enabled, false)%',
    'get_urbanmind_digest feature gate must default to false when row is absent (F11)';

  assert v_fn not ilike '%coalesce(v_enabled, true)%',
    'get_urbanmind_digest must not default to true (fail-open pattern removed)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 12) Semana 4: payment_intents delete guard exists
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'payment_intents'
      and t.tgname = 'payment_intents_guard_delete'
  ), 'payment_intents_guard_delete trigger must exist (Semana 4)';

  assert exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'guard_payment_intents_delete'
  ), 'guard_payment_intents_delete function must exist (Semana 4)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 13) Semana 4: admin_get_cpf_velocity_report RPC exists
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'admin_get_cpf_velocity_report'
  ), 'admin_get_cpf_velocity_report function must exist (Semana 3)';
end;
$$;

-- ---------------------------------------------------------------------------
-- 14) Deposit: block credit when payer document missing in webhook
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
begin
  select pg_get_functiondef(p.oid)
  into v_fn
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'service_process_syncpay_webhook'
  limit 1;

  assert v_fn ilike '%payer_document_missing%',
    'service_process_syncpay_webhook must handle payer_document_missing';

  assert v_fn ilike '%deposit_payer_cpf_missing%',
    'service_process_syncpay_webhook must set action deposit_payer_cpf_missing';

  assert v_fn ilike '%record_user_risk_alert%',
    'service_process_syncpay_webhook must call record_user_risk_alert for missing payer doc';

  assert v_fn ilike '%if v_payer_doc is null then%',
    'service_process_syncpay_webhook must branch on missing payer document';
end;
$$;

rollback;
