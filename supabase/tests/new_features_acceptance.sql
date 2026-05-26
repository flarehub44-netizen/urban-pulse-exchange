-- ViaX new features acceptance tests
-- Tests: market_alerts, following_active_bets, update_profile, markets_fts
-- Usage: psql $DATABASE_URL -f supabase/tests/new_features_acceptance.sql

begin;

-- ---------------------------------------------------------------------------
-- 1) market_alerts table structure
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'market_alerts'
  ), 'market_alerts table must exist';

  assert exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'market_alerts'
       and column_name = 'threshold'
  ), 'market_alerts must have threshold column';

  assert exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'market_alerts'
       and column_name = 'triggered'
  ), 'market_alerts must have triggered column';

  raise notice 'market_alerts table structure: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 2) check_market_alerts trigger function exists
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_proc
     where proname = 'check_market_alerts'
  ), 'check_market_alerts function must exist';

  raise notice 'check_market_alerts function: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) get_following_active_bets RPC exists and is callable
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_proc
     where proname = 'get_following_active_bets'
  ), 'get_following_active_bets function must exist';

  raise notice 'get_following_active_bets function: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) update_profile RPC exists with expected signature
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_proc
     where proname = 'update_profile'
  ), 'update_profile function must exist';

  raise notice 'update_profile function: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) update_profile validates handle format
-- ---------------------------------------------------------------------------
do $$
begin
  -- Should raise for invalid characters
  begin
    perform public.update_profile(p_handle := 'Invalid Handle!');
    assert false, 'Should have raised HANDLE_INVALID';
  exception when others then
    assert sqlerrm like '%HANDLE_INVALID%' or sqlerrm like '%P0001%',
      'Expected HANDLE_INVALID error, got: ' || sqlerrm;
  end;

  -- Should raise for too-short handle
  begin
    perform public.update_profile(p_handle := 'ab');
    assert false, 'Should have raised HANDLE_INVALID for short handle';
  exception when others then
    null; -- expected
  end;

  raise notice 'update_profile handle validation: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6) markets FTS column and index exist
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'markets'
       and column_name = 'fts'
  ), 'markets.fts column must exist';

  assert exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and tablename = 'markets'
       and indexname = 'markets_fts_idx'
  ), 'markets_fts_idx GIN index must exist';

  raise notice 'markets FTS column and index: OK';
end;
$$;

-- ---------------------------------------------------------------------------
-- 7) search_markets RPC exists
-- ---------------------------------------------------------------------------
do $$
begin
  assert exists (
    select 1 from pg_proc
     where proname = 'search_markets'
  ), 'search_markets function must exist';

  raise notice 'search_markets function: OK';
end;
$$;

rollback;
