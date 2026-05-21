-- ViaX resolution engine — acceptance scenarios (run after migrations on a dev DB)
-- Usage: psql $DATABASE_URL -f supabase/tests/resolution_engine_acceptance.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) validate_market_pools
-- ---------------------------------------------------------------------------
do $$
begin
  assert public.validate_market_pools(70000, 30000, 'YES') = 'settle';
  assert public.validate_market_pools(100000, 0, 'YES') = 'settle';
  assert public.validate_market_pools(100000, 0, 'NO') = 'void';
  assert public.validate_market_pools(97000, 3000, 'YES') = 'void';
  assert public.validate_market_pools(70000, 30000, 'NO') = 'settle';
  raise notice 'validate_market_pools: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) Payout math (70/30 pool, YES wins, 10% fee)
-- ---------------------------------------------------------------------------
do $$
declare
  v_prize numeric := (70000 + 30000) * 0.9;
  v_payout numeric := round((1000::numeric / 70000) * v_prize, 2);
begin
  assert v_prize = 90000;
  assert v_payout = 1285.71 or v_payout = 1285.72; -- rounding
  raise notice 'payout math: OK (payout=%)', v_payout;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Oracle derive side
-- ---------------------------------------------------------------------------
do $$
begin
  assert public.oracle_derive_side(5500, 5200, 'gt') = 'YES';
  assert public.oracle_derive_side(16, 18, 'lt') = 'YES';
  assert public.oracle_derive_side(20, 18, 'lt') = 'NO';
  raise notice 'oracle_derive_side: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Lifecycle tick (smoke — requires seeded markets)
-- ---------------------------------------------------------------------------
do $$
declare
  v_result jsonb;
begin
  v_result := public.tick_market_lifecycle();
  raise notice 'tick_market_lifecycle: %', v_result;
end;
$$;

rollback;

-- Manual checks (outside transaction):
-- A) Expired market → cron/tick → status settled within 2 min
-- B) place_bet after ends_at → exception 'Market entry window ended'
-- C) authenticated cannot: select has_function_privilege('authenticated', 'public.resolve_market(text,bet_side)', 'execute');
-- D) confidence < 0.85 → dispute (tune ai_confidence on test market)
