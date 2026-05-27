drop function if exists public.admin_list_football_pending(int);

create function public.admin_list_football_pending(
  p_limit int default 50,
  p_date date default null
)
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.football_assert_admin();

  return query
  select jsonb_build_object(
    'api_fixture_id', f.api_fixture_id,
    'kickoff_at', f.kickoff_at,
    'status_short', f.status_short,
    'home_team_name', f.home_team_name,
    'away_team_name', f.away_team_name,
    'league_id', f.api_league_id,
    'league_name', l.name,
    'review_status', f.review_status,
    'goals_home', f.goals_home,
    'goals_away', f.goals_away,
    'market_id', fm.id,
    'market_status', fm.status
  )
  from public.football_fixtures f
  join public.football_leagues l on l.api_league_id = f.api_league_id
  left join public.football_markets fm on fm.fixture_id = f.api_fixture_id
  where f.review_status = 'pending_review'
    and (p_date is null or (f.kickoff_at at time zone 'UTC')::date = p_date)
  order by f.kickoff_at asc
  limit greatest(1, least(p_limit, 200));
end;
$$;

grant execute on function public.admin_list_football_pending(int, date) to authenticated;
