-- Demo seed: 3 football live markets + 3 public community markets

-- ---------------------------------------------------------------------------
-- Football (approved fixtures + live 1X2 markets)
-- Skip api_fixture_id 999999003 — reserved for football_run_acceptance_flow()
-- ---------------------------------------------------------------------------
insert into public.football_fixtures (
  api_fixture_id, api_league_id, season, kickoff_at, status_short,
  home_team_id, home_team_name, away_team_id, away_team_name,
  goals_home, goals_away, review_status, reviewed_at
) values
  (
    999999002, 71, 2025, now() + interval '2 days', 'NS',
    127, 'Flamengo', 121, 'Palmeiras',
    null, null, 'approved', now()
  ),
  (
    999999004, 71, 2025, now() + interval '4 days', 'NS',
    130, 'Grêmio', 119, 'Internacional',
    null, null, 'approved', now()
  ),
  (
    999999005, 71, 2025, now() + interval '5 days', 'NS',
    1062, 'Atlético Mineiro', 124, 'Fluminense',
    null, null, 'approved', now()
  )
on conflict (api_fixture_id) do update set
  review_status = 'approved',
  kickoff_at = excluded.kickoff_at,
  home_team_name = excluded.home_team_name,
  away_team_name = excluded.away_team_name,
  status_short = excluded.status_short;

insert into public.football_markets (
  id, fixture_id, question, status, accept_bets, betting_closes_at,
  pool_home, pool_draw, pool_away, participants
) values
  (
    'fb-999999002', 999999002,
    'Flamengo x Palmeiras — quem vence?',
    'live', true, now() + interval '2 days',
    42317, 18149, 35263, 1915
  ),
  (
    'fb-999999004', 999999004,
    'Grêmio x Internacional — clássico gaúcho: resultado final',
    'live', true, now() + interval '4 days',
    21183, 9174, 24156, 1090
  ),
  (
    'fb-999999005', 999999005,
    'Atlético-MG x Fluminense — resultado (90 min)',
    'live', true, now() + interval '5 days',
    15142, 11097, 13188, 789
  )
on conflict (fixture_id) do update set
  status = 'live',
  accept_bets = true,
  question = excluded.question,
  betting_closes_at = excluded.betting_closes_at,
  pool_home = excluded.pool_home,
  pool_draw = excluded.pool_draw,
  pool_away = excluded.pool_away,
  participants = excluded.participants;

-- ---------------------------------------------------------------------------
-- Community (public, live) — created_by = first profile if any
-- ---------------------------------------------------------------------------
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from public.profiles order by created_at limit 1;

  insert into public.markets (
    id, question, region, target, category, ends_at,
    status, accept_bets, pool_yes, pool_no, participants, trend,
    ai_side, ai_value, ai_confidence,
    data_source, market_kind, created_by, visibility, resolution_mode, starts_at
  ) values
    (
      'cm-demoevent0001',
      'O metrô de SP terá atraso acima de 15 min amanhã no horário de pico?',
      'Comunidade', 0, 'Evento'::market_category,
      now() + interval '36 hours',
      'live', true, 850, 620, 19, 0.12,
      'YES'::bet_side, 0, 0.5,
      'manual', 'community', v_uid, 'public', 'creator', now()
    ),
    (
      'cm-demoevent0002',
      'Algum influencer postará vídeo sobre trânsito em SP ainda esta semana?',
      'Comunidade', 0, 'Evento'::market_category,
      now() + interval '5 days',
      'live', true, 1200, 400, 24, -0.08,
      'NO'::bet_side, 0, 0.5,
      'manual', 'community', v_uid, 'public', 'creator', now()
    ),
    (
      'cm-demoevent0003',
      'Choverá mais de 20 mm em São Paulo no próximo fim de semana?',
      'Comunidade', 0, 'Evento'::market_category,
      now() + interval '7 days',
      'live', true, 540, 780, 14, 0.05,
      'YES'::bet_side, 0, 0.5,
      'manual', 'community', v_uid, 'public', 'creator', now()
    )
  on conflict (id) do update set
    question = excluded.question,
    status = 'live',
    accept_bets = true,
    ends_at = excluded.ends_at,
    pool_yes = excluded.pool_yes,
    pool_no = excluded.pool_no,
    participants = excluded.participants,
    visibility = 'public',
    market_kind = 'community';

  if v_uid is not null then
    insert into public.market_access (market_id, user_id)
    values
      ('cm-demoevent0001', v_uid),
      ('cm-demoevent0002', v_uid),
      ('cm-demoevent0003', v_uid)
    on conflict do nothing;
  end if;
end $$;
