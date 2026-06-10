-- Acceptance: ligas privadas — score composto, join, moderação
-- Run: psql "$DATABASE_URL" -f supabase/tests/leagues_composite_flow.sql

begin;

do $$
declare
  v_creator uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_league_id uuid;
  v_code text;
  v_lb jsonb;
  v_rank jsonb;
begin
  insert into public.profiles (id, name, handle, avatar, division, balance)
  values
    (v_creator, 'Creator Test', 'creator_league', '', 'bronze', 1000),
    (v_member, 'Member Test', 'member_league', '', 'bronze', 1000);

  -- Simulate auth as creator
  perform set_config('request.jwt.claims', json_build_object('sub', v_creator)::text, true);

  select (public.create_league('Liga Teste SQL', false)->>'id')::uuid into v_league_id;
  select invite_code into v_code from public.leagues where id = v_league_id;

  if v_league_id is null then
    raise exception 'create_league failed';
  end if;

  perform set_config('request.jwt.claims', json_build_object('sub', v_member)::text, true);
  if (public.join_league(v_code)->>'ok')::boolean is not true then
    raise exception 'join_league failed';
  end if;

  perform public.refresh_league_member_stats(v_league_id);

  perform set_config('request.jwt.claims', json_build_object('sub', v_creator)::text, true);
  v_lb := public.get_league_leaderboard(v_league_id);
  if jsonb_array_length(v_lb) < 2 then
    raise exception 'leaderboard expected 2 members, got %', jsonb_array_length(v_lb);
  end if;

  v_rank := public.get_my_league_rank(v_league_id);
  if (v_rank->>'ok')::boolean is not true then
    raise exception 'get_my_league_rank failed';
  end if;

  -- Creator cannot leave
  begin
    perform public.leave_league(v_league_id);
    raise exception 'creator should not leave';
  exception when others then
    null;
  end;

  raise notice 'leagues_composite_flow: OK';
end $$;

rollback;
