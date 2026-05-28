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

rollback;
