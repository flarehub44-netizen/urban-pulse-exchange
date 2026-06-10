-- Ligas P2: verticais, preview público do pódio, rivalidade 1:1

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._league_verticals_allow_all(p_allowed text[])
returns boolean
language sql
immutable
as $$
  select p_allowed is null or cardinality(p_allowed) = 0;
$$;

create or replace function public._league_vertical_allowed(p_allowed text[], p_vertical text)
returns boolean
language sql
immutable
as $$
  select public._league_verticals_allow_all(p_allowed) or p_vertical = any(p_allowed);
$$;

-- ---------------------------------------------------------------------------
-- refresh_league_member_stats (vertical filter)
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
    where public._league_vertical_allowed(v_league.allowed_verticals, 'platform')
    union all
    select m.user_id, ob.stake, ob.payout, ob.created_at
    from members m
    join public.outcome_bets ob on ob.user_id = m.user_id
      and ob.created_at >= m.period_start
      and ob.created_at < m.period_end
      and ob.payout is not null
    join public.prediction_markets pm on pm.id = ob.market_id
    where public._league_vertical_allowed(v_league.allowed_verticals, 'prediction')
      and pm.vertical::text <> 'crypto'
    union all
    select m.user_id, ob.stake, ob.payout, ob.created_at
    from members m
    join public.outcome_bets ob on ob.user_id = m.user_id
      and ob.created_at >= m.period_start
      and ob.created_at < m.period_end
      and ob.payout is not null
    join public.prediction_markets pm on pm.id = ob.market_id
    where public._league_vertical_allowed(v_league.allowed_verticals, 'crypto')
      and pm.vertical::text = 'crypto'
    union all
    select m.user_id, fb.stake, fb.payout, fb.created_at
    from members m
    join public.football_bets fb on fb.user_id = m.user_id
      and fb.created_at >= m.period_start
      and fb.created_at < m.period_end
      and fb.payout is not null
    where public._league_vertical_allowed(v_league.allowed_verticals, 'football')
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
-- create_league + get_my_leagues + list_public_leagues
-- ---------------------------------------------------------------------------

create or replace function public.create_league(
  p_name text,
  p_is_public boolean default false,
  p_allowed_verticals text[] default null
)
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
  v_verticals text[];
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if length(coalesce(trim(p_name), '')) < 2 then raise exception 'invalid_name'; end if;

  v_verticals := case
    when p_allowed_verticals is null or cardinality(p_allowed_verticals) = 0 then null
    else p_allowed_verticals
  end;

  select count(*)::int into v_count from public.leagues where created_by = auth.uid();
  if v_count >= 5 then raise exception 'league_limit_reached'; end if;

  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.leagues where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'code_gen_failed'; end if;
  end loop;

  insert into public.leagues (
    name, invite_code, created_by, is_public, allowed_verticals,
    season_starts_at, season_ends_at, season_label
  )
  values (
    trim(p_name), v_code, auth.uid(), coalesce(p_is_public, false), v_verticals,
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
    'season_label', v_league.season_label,
    'allowed_verticals', v_league.allowed_verticals
  );
end;
$$;

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
        'season_ends_at', l.season_ends_at,
        'allowed_verticals', l.allowed_verticals
      )
      order by l.created_at desc
    )
    from public.leagues l
    join public.league_members lm on l.id = lm.league_id and lm.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_public_leagues(
  p_q text default null,
  p_limit int default 24,
  p_vertical text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_q text := nullif(trim(lower(coalesce(p_q, ''))), '');
  v_vertical text := nullif(trim(lower(coalesce(p_vertical, ''))), '');
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
        ),
        'allowed_verticals', l.allowed_verticals,
        'top_preview', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'rank', sub.rank_position,
              'score', sub.score,
              'label', sub.label
            )
            order by sub.rank_position
          )
          from (
            select
              lms.rank_position,
              lms.score,
              coalesce(nullif(split_part(p.name, ' ', 1), ''), 'Membro') as label
            from public.league_member_stats lms
            join public.profiles p on p.id = lms.user_id
            where lms.league_id = l.id
              and lms.season_starts_at = l.season_starts_at
              and lms.rank_position <= 3
            order by lms.rank_position
            limit 3
          ) sub
        ), '[]'::jsonb)
      ) as row_data
      from public.leagues l
      where l.is_public = true
        and (v_q is null or lower(l.name) like '%' || v_q || '%')
        and (
          v_vertical is null
          or l.allowed_verticals is null
          or cardinality(l.allowed_verticals) = 0
          or v_vertical = any(l.allowed_verticals)
        )
      order by (select count(*) from public.league_members lm where lm.league_id = l.id) desc
      limit greatest(p_limit, 1)
    ) sub
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- Head-to-head / suggested rival
-- ---------------------------------------------------------------------------

create or replace function public.get_league_head_to_head(
  p_league_id uuid,
  p_opponent_user_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_me public.league_member_stats%rowtype;
  v_them public.league_member_stats%rowtype;
  v_my_name text;
  v_their_name text;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;
  if p_opponent_user_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'same_user');
  end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  if not exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'not_member');
  end if;

  perform public.refresh_league_member_stats(p_league_id);

  select * into v_me from public.league_member_stats
  where league_id = p_league_id and user_id = auth.uid()
    and season_starts_at = v_league.season_starts_at;

  select * into v_them from public.league_member_stats
  where league_id = p_league_id and user_id = p_opponent_user_id
    and season_starts_at = v_league.season_starts_at;

  if not found then return jsonb_build_object('ok', false, 'reason', 'opponent_not_found'); end if;

  select name into v_my_name from public.profiles where id = auth.uid();
  select name into v_their_name from public.profiles where id = p_opponent_user_id;

  return jsonb_build_object(
    'ok', true,
    'me', jsonb_build_object(
      'user_id', auth.uid(),
      'name', v_my_name,
      'rank', v_me.rank_position,
      'score', coalesce(v_me.score, 0),
      'roi', coalesce(v_me.roi, 0),
      'volume', coalesce(v_me.stake_total, 0),
      'accuracy', coalesce(v_me.accuracy, 0)
    ),
    'opponent', jsonb_build_object(
      'user_id', p_opponent_user_id,
      'name', v_their_name,
      'rank', v_them.rank_position,
      'score', coalesce(v_them.score, 0),
      'roi', coalesce(v_them.roi, 0),
      'volume', coalesce(v_them.stake_total, 0),
      'accuracy', coalesce(v_them.accuracy, 0)
    ),
    'score_gap', coalesce(v_me.score, 0) - coalesce(v_them.score, 0),
    'rank_gap', coalesce(v_them.rank_position, 0) - coalesce(v_me.rank_position, 0)
  );
end;
$$;

create or replace function public.get_league_suggested_rival(p_league_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_league public.leagues%rowtype;
  v_my_rank int;
  v_rival uuid;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;

  select * into v_league from public.leagues where id = p_league_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;

  select lms.rank_position into v_my_rank
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.user_id = auth.uid()
    and lms.season_starts_at = v_league.season_starts_at;

  if v_my_rank is null or v_my_rank <= 1 then
    return jsonb_build_object('ok', false, 'reason', 'no_rival');
  end if;

  select lms.user_id into v_rival
  from public.league_member_stats lms
  where lms.league_id = p_league_id
    and lms.season_starts_at = v_league.season_starts_at
    and lms.rank_position = v_my_rank - 1
  limit 1;

  if v_rival is null then return jsonb_build_object('ok', false, 'reason', 'no_rival'); end if;

  return public.get_league_head_to_head(p_league_id, v_rival);
end;
$$;

grant execute on function public.get_league_head_to_head(uuid, uuid) to authenticated;
grant execute on function public.get_league_suggested_rival(uuid) to authenticated;
