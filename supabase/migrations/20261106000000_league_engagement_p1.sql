-- Ligas P1: notificações de subida, badges, missão semanal, cron refresh/advance

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------

insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('league_champion', 'Campeão de Liga', 'Venceu uma temporada em liga privada', '🏆', 'competicao', 46),
  ('league_podium',   'Pódio da Liga',   'Ficou no top 3 de uma temporada de liga', '🥇', 'competicao', 47),
  ('league_weekly',   'Semana na Liga',  'Completou o bônus semanal da liga', '⚡', 'competicao', 48)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Weekly league bonus claims
-- ---------------------------------------------------------------------------

create table if not exists public.user_league_weekly_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  week_start date not null,
  xp_awarded int not null default 50,
  claimed_at timestamptz not null default now(),
  primary key (user_id, league_id, week_start)
);

alter table public.user_league_weekly_claims enable row level security;

drop policy if exists user_league_weekly_claims_own on public.user_league_weekly_claims;
create policy user_league_weekly_claims_own on public.user_league_weekly_claims
  for select to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notify_league_rank_changes (drops + climbs)
-- ---------------------------------------------------------------------------

create or replace function public.notify_league_rank_changes(p_league_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_row record;
begin
  select * into v_league from public.leagues where id = p_league_id;
  if not found then return; end if;

  for v_row in
    select lms.user_id, lms.rank_position, lms.prev_rank_position
    from public.league_member_stats lms
    where lms.league_id = p_league_id
      and lms.season_starts_at = v_league.season_starts_at
      and lms.prev_rank_position is not null
      and lms.rank_position is not null
      and lms.prev_rank_position <= 3
      and lms.rank_position > lms.prev_rank_position
  loop
    insert into public.notifications (user_id, kind, text, league_id)
    values (
      v_row.user_id,
      'league',
      format('Você caiu para #%s na liga %s', v_row.rank_position, v_league.name),
      p_league_id
    );
  end loop;

  for v_row in
    select lms.user_id, lms.rank_position, lms.prev_rank_position
    from public.league_member_stats lms
    where lms.league_id = p_league_id
      and lms.season_starts_at = v_league.season_starts_at
      and lms.prev_rank_position is not null
      and lms.rank_position is not null
      and lms.rank_position <= 3
      and lms.prev_rank_position > 3
  loop
    insert into public.notifications (user_id, kind, text, league_id)
    values (
      v_row.user_id,
      'league',
      format('Você subiu para #%s na liga %s!', v_row.rank_position, v_league.name),
      p_league_id
    );
  end loop;

  for v_row in
    select lms.user_id, lms.rank_position, lms.prev_rank_position
    from public.league_member_stats lms
    where lms.league_id = p_league_id
      and lms.season_starts_at = v_league.season_starts_at
      and lms.prev_rank_position is not null
      and lms.rank_position is not null
      and lms.rank_position < lms.prev_rank_position
      and lms.rank_position > 3
      and (lms.prev_rank_position - lms.rank_position) >= 2
  loop
    insert into public.notifications (user_id, kind, text, league_id)
    values (
      v_row.user_id,
      'league',
      format('Você subiu para #%s na liga %s', v_row.rank_position, v_league.name),
      p_league_id
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- _finalize_league_season (shared by manual advance + cron)
-- ---------------------------------------------------------------------------

create or replace function public._finalize_league_season(
  p_league_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_winner uuid;
  v_top jsonb;
  v_new_start timestamptz;
  v_new_end timestamptz;
  v_label text;
  v_old_season_start timestamptz;
begin
  select * into v_league from public.leagues where id = p_league_id for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if not p_force and v_league.season_ends_at > now() then
    return jsonb_build_object('ok', false, 'reason', 'season_not_ended');
  end if;

  v_old_season_start := v_league.season_starts_at;
  perform public.refresh_league_member_stats(p_league_id);

  select lms.user_id into v_winner
  from public.league_member_stats lms
  where lms.league_id = p_league_id and lms.season_starts_at = v_old_season_start
  order by lms.rank_position nulls last, lms.score desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object('user_id', lms.user_id, 'rank', lms.rank_position, 'score', lms.score)
    order by lms.rank_position
  ), '[]'::jsonb)
  into v_top
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.season_starts_at = v_old_season_start
    and lms.rank_position <= 3;

  insert into public.league_season_history (
    league_id, season_label, starts_at, ends_at, winner_user_id, top_scores
  ) values (
    p_league_id, coalesce(v_league.season_label, 'Temporada'), v_old_season_start,
    v_league.season_ends_at, v_winner, v_top
  );

  if v_winner is not null then
    insert into public.user_achievements (user_id, achievement_id)
    values (v_winner, 'league_champion')
    on conflict do nothing;
  end if;

  insert into public.user_achievements (user_id, achievement_id)
  select lms.user_id, 'league_podium'
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.season_starts_at = v_old_season_start
    and lms.rank_position <= 3
  on conflict do nothing;

  insert into public.notifications (user_id, kind, text, league_id)
  select
    lms.user_id,
    'league',
    format(
      'Temporada encerrada na liga %s — você ficou em #%s (score %s). Campeão: %s',
      v_league.name,
      coalesce(lms.rank_position::text, '—'),
      coalesce(lms.score::text, '0'),
      coalesce((select name from public.profiles where id = v_winner), '—')
    ),
    p_league_id
  from public.league_member_stats lms
  where lms.league_id = p_league_id and lms.season_starts_at = v_old_season_start;

  v_new_start := v_league.season_ends_at;
  v_new_end := v_new_start + interval '7 days';
  v_label := 'Semana ' || to_char(v_new_start at time zone 'America/Sao_Paulo', 'IW · YYYY');

  update public.leagues
  set season_starts_at = v_new_start,
      season_ends_at = v_new_end,
      season_label = v_label
  where id = p_league_id;

  delete from public.league_member_stats
  where league_id = p_league_id and season_starts_at = v_old_season_start;

  perform public.refresh_league_member_stats(p_league_id);

  return jsonb_build_object(
    'ok', true,
    'season_label', v_label,
    'winner_user_id', v_winner,
    'top_scores', v_top
  );
end;
$$;

create or replace function public.advance_league_season(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_league.created_by <> auth.uid() then raise exception 'forbidden'; end if;

  return public._finalize_league_season(p_league_id, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Cron helpers (service_role)
-- ---------------------------------------------------------------------------

create or replace function public.cron_refresh_league_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_count int := 0;
begin
  for v_league_id in
    select distinct lm.league_id
    from public.league_members lm
    join public.leagues l on l.id = lm.league_id
    where l.season_ends_at > now()
      and (
        exists (
          select 1 from public.bets b
          where b.user_id = lm.user_id and b.created_at > now() - interval '1 hour'
        )
        or exists (
          select 1 from public.outcome_bets ob
          where ob.user_id = lm.user_id and ob.created_at > now() - interval '1 hour'
        )
        or exists (
          select 1 from public.football_bets fb
          where fb.user_id = lm.user_id and fb.created_at > now() - interval '1 hour'
        )
      )
  loop
    perform public.refresh_league_member_stats(v_league_id);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'refreshed', v_count);
end;
$$;

create or replace function public.cron_advance_expired_league_seasons()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league_id uuid;
  v_count int := 0;
  v_res jsonb;
begin
  for v_league_id in
    select id from public.leagues where season_ends_at <= now()
  loop
    v_res := public._finalize_league_season(v_league_id);
    if coalesce((v_res->>'ok')::boolean, false) then
      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object('ok', true, 'advanced', v_count);
end;
$$;

revoke execute on function public.cron_refresh_league_stats() from public, anon, authenticated;
revoke execute on function public.cron_advance_expired_league_seasons() from public, anon, authenticated;
grant execute on function public.cron_refresh_league_stats() to service_role;
grant execute on function public.cron_advance_expired_league_seasons() to service_role;

-- ---------------------------------------------------------------------------
-- Weekly league mission
-- ---------------------------------------------------------------------------

create or replace function public.get_league_weekly_missions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := date_trunc('week', timezone('America/Sao_Paulo', now()))::date;
begin
  if v_uid is null then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'league_id', l.id,
        'league_name', l.name,
        'settled_count', coalesce(lms.settled_count, 0),
        'eligible', coalesce(lms.settled_count, 0) >= 1,
        'claimed', exists (
          select 1 from public.user_league_weekly_claims c
          where c.user_id = v_uid and c.league_id = l.id and c.week_start = v_week
        ),
        'xp_reward', 50,
        'season_label', l.season_label
      )
      order by l.name
    )
    from public.leagues l
    join public.league_members lm on lm.league_id = l.id and lm.user_id = v_uid
    left join public.league_member_stats lms
      on lms.league_id = l.id
     and lms.user_id = v_uid
     and lms.season_starts_at = l.season_starts_at
  ), '[]'::jsonb);
end;
$$;

create or replace function public.claim_league_weekly_bonus(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_week date := date_trunc('week', timezone('America/Sao_Paulo', now()))::date;
  v_league public.leagues%rowtype;
  v_settled int;
  v_xp int := 50;
begin
  if v_uid is null then raise exception 'unauthenticated'; end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = v_uid
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  perform public.refresh_league_member_stats(p_league_id);

  select coalesce(lms.settled_count, 0) into v_settled
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.user_id = v_uid
    and lms.season_starts_at = v_league.season_starts_at;

  if coalesce(v_settled, 0) < 1 then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  if exists (
    select 1 from public.user_league_weekly_claims
    where user_id = v_uid and league_id = p_league_id and week_start = v_week
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_claimed');
  end if;

  insert into public.user_league_weekly_claims (user_id, league_id, week_start, xp_awarded)
  values (v_uid, p_league_id, v_week, v_xp);

  insert into public.user_achievements (user_id, achievement_id)
  values (v_uid, 'league_weekly')
  on conflict do nothing;

  return public.apply_user_progress(v_uid, 'league_weekly_bonus', v_xp);
end;
$$;

revoke execute on function public.get_league_weekly_missions() from public, anon, authenticated;
grant execute on function public.get_league_weekly_missions() to authenticated;

revoke execute on function public.claim_league_weekly_bonus(uuid) from public, anon, authenticated;
grant execute on function public.claim_league_weekly_bonus(uuid) to authenticated;
