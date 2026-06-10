-- Ligas privadas: temporadas, score composto, notificações, moderação

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.leagues
  add column if not exists description text,
  add column if not exists season_starts_at timestamptz not null default date_trunc('week', now() at time zone 'America/Sao_Paulo'),
  add column if not exists season_ends_at timestamptz not null default date_trunc('week', now() at time zone 'America/Sao_Paulo') + interval '7 days',
  add column if not exists season_label text,
  add column if not exists max_members int not null default 50,
  add column if not exists allowed_verticals text[];

update public.leagues
set
  season_starts_at = coalesce(season_starts_at, date_trunc('week', created_at at time zone 'America/Sao_Paulo')),
  season_ends_at = coalesce(season_ends_at, date_trunc('week', created_at at time zone 'America/Sao_Paulo') + interval '7 days'),
  season_label = coalesce(season_label, 'Semana ' || to_char(coalesce(created_at, now()), 'IW · YYYY'))
where season_label is null;

create table if not exists public.league_season_history (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  winner_user_id uuid references public.profiles(id) on delete set null,
  top_scores jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists league_season_history_league_idx
  on public.league_season_history (league_id, ends_at desc);

create table if not exists public.league_member_stats (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_starts_at timestamptz not null,
  stake_total numeric(14,2) not null default 0,
  payout_total numeric(14,2) not null default 0,
  settled_count int not null default 0,
  won_count int not null default 0,
  roi numeric(8,4) not null default 0,
  accuracy numeric(8,4) not null default 0,
  score int not null default 0,
  rank_position int,
  prev_rank_position int,
  updated_at timestamptz not null default now(),
  primary key (league_id, user_id, season_starts_at)
);

create index if not exists league_member_stats_rank_idx
  on public.league_member_stats (league_id, season_starts_at, score desc);

alter table public.league_season_history enable row level security;
alter table public.league_member_stats enable row level security;

create policy league_season_history_member_read on public.league_season_history
  for select to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_season_history.league_id and lm.user_id = auth.uid()
    )
    or exists (
      select 1 from public.leagues l
      where l.id = league_season_history.league_id and l.is_public = true
    )
  );

create policy league_member_stats_member_read on public.league_member_stats
  for select to authenticated
  using (
    exists (
      select 1 from public.league_members lm
      where lm.league_id = league_member_stats.league_id and lm.user_id = auth.uid()
    )
  );

alter table public.notifications
  add column if not exists league_id uuid references public.leagues(id) on delete set null;

do $$ begin
  alter type public.notif_kind add value 'league';
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._league_clamp_roi(p_roi numeric)
returns numeric
language sql
immutable
as $$
  select greatest(-1::numeric, least(2::numeric, coalesce(p_roi, 0)));
$$;

create or replace function public._league_compute_score(
  p_roi numeric,
  p_volume numeric,
  p_accuracy numeric,
  p_max_volume numeric
)
returns int
language sql
immutable
as $$
  select round(
    400 * (public._league_clamp_roi(p_roi) + 1) / 3
    + case
        when coalesce(p_max_volume, 0) > 0
          then 300 * ln(1 + greatest(coalesce(p_volume, 0), 0)) / ln(1 + p_max_volume)
        else 0
      end
    + 300 * greatest(0, least(1, coalesce(p_accuracy, 0)))
  )::int;
$$;

-- ---------------------------------------------------------------------------
-- refresh_league_member_stats
-- ---------------------------------------------------------------------------

create or replace function public.refresh_league_member_stats(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_max_volume numeric := 0;
begin
  select * into v_league from public.leagues where id = p_league_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  with members as (
    select
      lm.user_id,
      greatest(lm.joined_at, v_league.season_starts_at) as period_start,
      least(now(), v_league.season_ends_at) as period_end
    from public.league_members lm
    where lm.league_id = p_league_id
  ),
  bet_rows as (
    select m.user_id, b.stake, b.payout, b.created_at
    from members m
    join public.bets b on b.user_id = m.user_id
      and b.created_at >= m.period_start
      and b.created_at < m.period_end
      and b.payout is not null
    union all
    select m.user_id, ob.stake, ob.payout, ob.created_at
    from members m
    join public.outcome_bets ob on ob.user_id = m.user_id
      and ob.created_at >= m.period_start
      and ob.created_at < m.period_end
      and ob.payout is not null
    union all
    select m.user_id, fb.stake, fb.payout, fb.created_at
    from members m
    join public.football_bets fb on fb.user_id = m.user_id
      and fb.created_at >= m.period_start
      and fb.created_at < m.period_end
      and fb.payout is not null
  ),
  agg as (
    select
      m.user_id,
      coalesce(sum(br.stake), 0) as stake_total,
      coalesce(sum(br.payout), 0) as payout_total,
      count(br.stake)::int as settled_count,
      count(*) filter (where br.payout > br.stake)::int as won_count
    from members m
    left join bet_rows br on br.user_id = m.user_id
    group by m.user_id
  ),
  scored as (
    select
      a.*,
      case
        when a.stake_total > 0 then (a.payout_total - a.stake_total) / a.stake_total
        else 0
      end as roi,
      case
        when a.settled_count > 0 then a.won_count::numeric / a.settled_count
        else 0
      end as accuracy,
      a.stake_total as volume
    from agg a
  ),
  max_vol as (
    select greatest(coalesce(max(volume), 0), 1) as mv from scored
  )
  select coalesce(max(volume), 0) into v_max_volume from scored;

  insert into public.league_member_stats (
    league_id, user_id, season_starts_at,
    stake_total, payout_total, settled_count, won_count,
    roi, accuracy, score, prev_rank_position, rank_position, updated_at
  )
  select
    p_league_id,
    s.user_id,
    v_league.season_starts_at,
    s.stake_total,
    s.payout_total,
    s.settled_count,
    s.won_count,
    s.roi,
    s.accuracy,
    public._league_compute_score(s.roi, s.volume, s.accuracy, v_max_volume),
    lms.rank_position,
    null,
    now()
  from scored s
  left join public.league_member_stats lms
    on lms.league_id = p_league_id
   and lms.user_id = s.user_id
   and lms.season_starts_at = v_league.season_starts_at
  on conflict (league_id, user_id, season_starts_at) do update set
    stake_total = excluded.stake_total,
    payout_total = excluded.payout_total,
    settled_count = excluded.settled_count,
    won_count = excluded.won_count,
    roi = excluded.roi,
    accuracy = excluded.accuracy,
    score = excluded.score,
    prev_rank_position = public.league_member_stats.rank_position,
    updated_at = now();

  with ranked as (
    select
      user_id,
      row_number() over (order by score desc, stake_total desc, user_id) as rn
    from public.league_member_stats
    where league_id = p_league_id and season_starts_at = v_league.season_starts_at
  )
  update public.league_member_stats lms
  set rank_position = r.rn
  from ranked r
  where lms.league_id = p_league_id
    and lms.user_id = r.user_id
    and lms.season_starts_at = v_league.season_starts_at;

  perform public.notify_league_rank_changes(p_league_id);

  return jsonb_build_object('ok', true, 'members', (
    select count(*)::int from public.league_member_stats
    where league_id = p_league_id and season_starts_at = v_league.season_starts_at
  ));
end;
$$;

-- ---------------------------------------------------------------------------
-- notify_league_rank_changes
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
    select lms.user_id, lms.rank_position, lms.prev_rank_position, p.name
    from public.league_member_stats lms
    join public.profiles p on p.id = lms.user_id
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
end;
$$;

-- ---------------------------------------------------------------------------
-- get_league_leaderboard (composite)
-- ---------------------------------------------------------------------------

create or replace function public.get_league_leaderboard(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return '[]'::jsonb;
  end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  ) then
    return '[]'::jsonb;
  end if;

  perform public.refresh_league_member_stats(p_league_id);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'name', p.name,
        'handle', p.handle,
        'avatar', coalesce(p.avatar, ''),
        'division', p.division,
        'is_me', p.id = auth.uid(),
        'rank', lms.rank_position,
        'score', lms.score,
        'roi', lms.roi,
        'volume', lms.stake_total,
        'accuracy', lms.accuracy,
        'settled_count', lms.settled_count,
        'delta_rank', case
          when lms.prev_rank_position is not null and lms.rank_position is not null
            then lms.prev_rank_position - lms.rank_position
          else 0
        end
      )
      order by lms.rank_position nulls last, lms.score desc
    )
    from public.league_member_stats lms
    join public.profiles p on p.id = lms.user_id
    join public.leagues l on l.id = lms.league_id
    where lms.league_id = p_league_id
      and lms.season_starts_at = l.season_starts_at
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_league_rank
-- ---------------------------------------------------------------------------

create or replace function public.get_my_league_rank(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_league public.leagues%rowtype;
  v_stats public.league_member_stats%rowtype;
  v_member_count int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false);
  end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select count(*)::int into v_member_count
  from public.league_members where league_id = p_league_id;

  select * into v_stats
  from public.league_member_stats
  where league_id = p_league_id
    and user_id = v_uid
    and season_starts_at = v_league.season_starts_at;

  if not found then
    perform public.refresh_league_member_stats(p_league_id);
    select * into v_stats
    from public.league_member_stats
    where league_id = p_league_id
      and user_id = v_uid
      and season_starts_at = v_league.season_starts_at;
  end if;

  return jsonb_build_object(
    'ok', true,
    'rank', coalesce(v_stats.rank_position, v_member_count),
    'score', coalesce(v_stats.score, 0),
    'member_count', v_member_count,
    'roi', coalesce(v_stats.roi, 0),
    'volume', coalesce(v_stats.stake_total, 0),
    'accuracy', coalesce(v_stats.accuracy, 0),
    'season_label', v_league.season_label
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- advance_league_season
-- ---------------------------------------------------------------------------

create or replace function public.advance_league_season(p_league_id uuid)
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
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_league.created_by <> auth.uid() then raise exception 'forbidden'; end if;

  perform public.refresh_league_member_stats(p_league_id);

  select lms.user_id into v_winner
  from public.league_member_stats lms
  where lms.league_id = p_league_id and lms.season_starts_at = v_league.season_starts_at
  order by lms.rank_position nulls last, lms.score desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object('user_id', lms.user_id, 'rank', lms.rank_position, 'score', lms.score)
    order by lms.rank_position
  ), '[]'::jsonb)
  into v_top
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.season_starts_at = v_league.season_starts_at
    and lms.rank_position <= 3;

  insert into public.league_season_history (
    league_id, season_label, starts_at, ends_at, winner_user_id, top_scores
  ) values (
    p_league_id, coalesce(v_league.season_label, 'Temporada'), v_league.season_starts_at,
    v_league.season_ends_at, v_winner, v_top
  );

  v_new_start := v_league.season_ends_at;
  v_new_end := v_new_start + interval '7 days';
  v_label := 'Semana ' || to_char(v_new_start at time zone 'America/Sao_Paulo', 'IW · YYYY');

  update public.leagues
  set season_starts_at = v_new_start,
      season_ends_at = v_new_end,
      season_label = v_label
  where id = p_league_id;

  delete from public.league_member_stats
  where league_id = p_league_id and season_starts_at = v_league.season_starts_at;

  insert into public.notifications (user_id, kind, text, league_id)
  select
    lm.user_id,
    'league',
    format(
      'Temporada encerrada na liga %s — campeão: %s',
      v_league.name,
      coalesce((select name from public.profiles where id = v_winner), '—')
    ),
    p_league_id
  from public.league_members lm
  where lm.league_id = p_league_id;

  perform public.refresh_league_member_stats(p_league_id);

  return jsonb_build_object('ok', true, 'season_label', v_label, 'winner_user_id', v_winner);
end;
$$;

-- ---------------------------------------------------------------------------
-- list_public_leagues
-- ---------------------------------------------------------------------------

create or replace function public.list_public_leagues(
  p_q text default null,
  p_limit int default 24
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := nullif(trim(lower(coalesce(p_q, ''))), '');
begin
  return coalesce((
    select jsonb_agg(row_data order by row_data->>'member_count' desc)
    from (
      select jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'member_count', (select count(*)::int from public.league_members lm where lm.league_id = l.id),
        'season_label', l.season_label,
        'is_member', exists (
          select 1 from public.league_members lm
          where lm.league_id = l.id and lm.user_id = auth.uid()
        ),
        'top_score', (
          select coalesce(max(lms.score), 0)
          from public.league_member_stats lms
          where lms.league_id = l.id and lms.season_starts_at = l.season_starts_at
        )
      ) as row_data
      from public.leagues l
      where l.is_public = true
        and (v_q is null or lower(l.name) like '%' || v_q || '%')
      order by (select count(*) from public.league_members lm where lm.league_id = l.id) desc
      limit greatest(p_limit, 1)
    ) sub
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_league_activity
-- ---------------------------------------------------------------------------

create or replace function public.get_league_activity(
  p_league_id uuid,
  p_limit int default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
begin
  select * into v_league from public.leagues where id = p_league_id;
  if not found then return '[]'::jsonb; end if;

  if auth.uid() is null or not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    with events as (
      select b.created_at as at, 'bet'::text as kind, p.name as user_name, b.market_id, b.stake
      from public.bets b
      join public.league_members lm on lm.user_id = b.user_id and lm.league_id = p_league_id
      join public.profiles p on p.id = b.user_id
      where b.created_at >= greatest(lm.joined_at, v_league.season_starts_at)
        and b.created_at < least(now(), v_league.season_ends_at)
      union all
      select ob.created_at, 'bet', p.name, ob.market_id, ob.stake
      from public.outcome_bets ob
      join public.league_members lm on lm.user_id = ob.user_id and lm.league_id = p_league_id
      join public.profiles p on p.id = ob.user_id
      where ob.created_at >= greatest(lm.joined_at, v_league.season_starts_at)
        and ob.created_at < least(now(), v_league.season_ends_at)
      union all
      select lm.joined_at, 'join', p.name, null::text, null::numeric
      from public.league_members lm
      join public.profiles p on p.id = lm.user_id
      where lm.league_id = p_league_id
    )
    select jsonb_agg(
      jsonb_build_object(
        'kind', e.kind,
        'at', e.at,
        'user_name', e.user_name,
        'market_id', e.market_id,
        'stake', e.stake
      )
      order by e.at desc
    )
    from (
      select * from events order by at desc limit greatest(p_limit, 1)
    ) e
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- create_league (updated)
-- ---------------------------------------------------------------------------

create or replace function public.create_league(p_name text, p_is_public boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
  v_code text;
  v_attempt int := 0;
  v_count int;
  v_start timestamptz := date_trunc('week', now() at time zone 'America/Sao_Paulo');
  v_label text := 'Semana ' || to_char(now() at time zone 'America/Sao_Paulo', 'IW · YYYY');
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if length(coalesce(trim(p_name), '')) < 2 then raise exception 'invalid_name'; end if;

  select count(*)::int into v_count from public.leagues where created_by = auth.uid();
  if v_count >= 5 then raise exception 'league_limit_reached'; end if;

  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'code_gen_failed'; end if;
  end loop;

  insert into public.leagues (
    name, invite_code, created_by, is_public,
    season_starts_at, season_ends_at, season_label
  )
  values (
    trim(p_name), v_code, auth.uid(), coalesce(p_is_public, false),
    v_start, v_start + interval '7 days', v_label
  )
  returning * into v_league;

  insert into public.league_members (league_id, user_id)
  values (v_league.id, auth.uid());

  perform public.refresh_league_member_stats(v_league.id);

  return jsonb_build_object(
    'id', v_league.id,
    'name', v_league.name,
    'invite_code', v_league.invite_code,
    'is_public', v_league.is_public,
    'season_label', v_league.season_label
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- join_league (updated)
-- ---------------------------------------------------------------------------

create or replace function public.join_league(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
  v_member_count int;
  v_joiner_name text;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select * into v_league from public.leagues where invite_code = upper(p_invite_code);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if exists (
    select 1 from public.league_members
    where league_id = v_league.id and user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', true, 'league_id', v_league.id, 'already_member', true, 'name', v_league.name);
  end if;

  select count(*)::int into v_member_count from public.league_members where league_id = v_league.id;
  if v_member_count >= v_league.max_members then
    return jsonb_build_object('ok', false, 'reason', 'league_full');
  end if;

  insert into public.league_members (league_id, user_id) values (v_league.id, auth.uid());

  select name into v_joiner_name from public.profiles where id = auth.uid();

  if v_league.created_by <> auth.uid() then
    insert into public.notifications (user_id, kind, text, league_id)
    values (
      v_league.created_by,
      'league',
      coalesce(v_joiner_name, 'Alguém') || ' entrou na liga ' || v_league.name,
      v_league.id
    );
  end if;

  perform public.refresh_league_member_stats(v_league.id);

  return jsonb_build_object('ok', true, 'league_id', v_league.id, 'name', v_league.name);
end;
$$;

-- ---------------------------------------------------------------------------
-- join_league_by_id (public leagues)
-- ---------------------------------------------------------------------------

create or replace function public.join_league_by_id(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_league public.leagues;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select * into v_league from public.leagues where id = p_league_id and is_public = true;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_public');
  end if;

  return public.join_league(v_league.invite_code);
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_league (updated — creator guard)
-- ---------------------------------------------------------------------------

create or replace function public.leave_league(p_league_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select created_by into v_owner from public.leagues where id = p_league_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_owner = auth.uid() then raise exception 'must_transfer_or_delete'; end if;

  delete from public.league_members where league_id = p_league_id and user_id = auth.uid();
  delete from public.league_member_stats
  where league_id = p_league_id and user_id = auth.uid();

  perform public.refresh_league_member_stats(p_league_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- kick_league_member
-- ---------------------------------------------------------------------------

create or replace function public.kick_league_member(p_league_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot_kick_self'; end if;

  select created_by into v_owner from public.leagues where id = p_league_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_owner <> auth.uid() then raise exception 'forbidden'; end if;

  delete from public.league_members where league_id = p_league_id and user_id = p_user_id;
  delete from public.league_member_stats where league_id = p_league_id and user_id = p_user_id;

  perform public.refresh_league_member_stats(p_league_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- transfer_league_ownership
-- ---------------------------------------------------------------------------

create or replace function public.transfer_league_ownership(p_league_id uuid, p_new_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;

  select created_by into v_owner from public.leagues where id = p_league_id;
  if v_owner is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_owner <> auth.uid() then raise exception 'forbidden'; end if;
  if p_new_owner_id = auth.uid() then raise exception 'already_owner'; end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = p_new_owner_id
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  update public.leagues set created_by = p_new_owner_id where id = p_league_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_leagues (updated)
-- ---------------------------------------------------------------------------

create or replace function public.get_my_leagues()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'invite_code', l.invite_code,
        'is_public', l.is_public,
        'is_creator', l.created_by = auth.uid(),
        'member_count', (select count(*)::int from public.league_members lm2 where lm2.league_id = l.id),
        'season_label', l.season_label,
        'season_ends_at', l.season_ends_at
      )
      order by l.created_at desc
    )
    from public.leagues l
    join public.league_members lm on l.id = lm.league_id and lm.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant execute on function public.refresh_league_member_stats(uuid) to authenticated, service_role;
grant execute on function public.get_league_leaderboard(uuid) to authenticated;
grant execute on function public.get_my_league_rank(uuid) to authenticated;
grant execute on function public.advance_league_season(uuid) to authenticated;
grant execute on function public.list_public_leagues(text, int) to authenticated;
grant execute on function public.get_league_activity(uuid, int) to authenticated;
grant execute on function public.join_league_by_id(uuid) to authenticated;
grant execute on function public.kick_league_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_league_ownership(uuid, uuid) to authenticated;
