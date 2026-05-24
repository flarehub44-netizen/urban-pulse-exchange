-- Football 1X2 acceptance (run on dev DB after migrations)
-- Usage: psql $DATABASE_URL -f supabase/tests/football_markets_acceptance.sql

begin;

insert into public.football_fixtures (
  api_fixture_id, api_league_id, season, kickoff_at, status_short,
  home_team_id, home_team_name, away_team_id, away_team_name,
  review_status
) values (
  999999002, 71, 2025, now() + interval '2 days', 'NS',
  1, 'Team A', 2, 'Team B', 'pending_review'
) on conflict (api_fixture_id) do update set review_status = 'pending_review';

do $$
declare
  v_action text;
begin
  v_action := public.validate_football_pools(100, 100, 100, 'HOME'::public.football_outcome);
  if v_action <> 'settle' then raise exception 'expected settle balanced pools, got %', v_action; end if;

  v_action := public.validate_football_pools(1000, 10, 10, 'HOME'::public.football_outcome);
  if v_action <> 'void' then raise exception 'expected void imbalanced pools, got %', v_action; end if;
end;
$$;

do $$
begin
  if public.football_derive_outcome(2, 1) <> 'HOME' then raise exception 'derive HOME failed'; end if;
  if public.football_derive_outcome(1, 1) <> 'DRAW' then raise exception 'derive DRAW failed'; end if;
  if public.football_derive_outcome(0, 3) <> 'AWAY' then raise exception 'derive AWAY failed'; end if;
end;
$$;

rollback;

-- Full E2E flow (approve → publish → bet → resolve) via security definer helper
do $$
declare
  v_result jsonb;
begin
  v_result := public.football_run_acceptance_flow();
  if coalesce(v_result->>'ok', 'false') <> 'true' then
    raise exception 'football_run_acceptance_flow failed: %', v_result;
  end if;
  raise notice 'football_run_acceptance_flow: OK (payout=%)', v_result->>'payout';
end;
$$;

select 'football_markets_acceptance ok' as result;
