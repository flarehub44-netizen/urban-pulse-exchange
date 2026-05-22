-- Sprint 3-5: Leagues, Prediction Journal, Seasonal Events, Daily Poll

-- A4: Prediction Journal — note on bets
alter table bets add column if not exists note text;

-- A3: Private Leagues
create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique not null,
  created_by uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table if not exists league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (league_id, user_id)
);

alter table leagues enable row level security;
alter table league_members enable row level security;

create policy "leagues_select" on leagues for select using (true);
create policy "leagues_insert" on leagues for insert with check (auth.uid() = created_by);
create policy "leagues_delete" on leagues for delete using (auth.uid() = created_by);

create policy "league_members_select" on league_members for select using (true);
create policy "league_members_insert" on league_members for insert with check (auth.uid() = user_id);
create policy "league_members_delete" on league_members for delete using (auth.uid() = user_id);

-- A5: Seasonal / Platform Events
create table if not exists platform_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  badge_icon text default '🎉',
  xp_boost int default 0,
  created_at timestamptz default now()
);

alter table platform_events enable row level security;
create policy "events_select" on platform_events for select using (true);
create policy "events_insert" on platform_events for insert using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- D3: Daily Poll
create table if not exists daily_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  poll_date date unique not null default current_date,
  yes_count int not null default 0,
  no_count int not null default 0,
  created_at timestamptz default now()
);

create table if not exists poll_votes (
  poll_id uuid references daily_polls(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz default now(),
  primary key (poll_id, user_id)
);

alter table daily_polls enable row level security;
alter table poll_votes enable row level security;

create policy "polls_select" on daily_polls for select using (true);
create policy "poll_votes_select" on poll_votes for select using (true);
create policy "poll_votes_insert" on poll_votes for insert with check (auth.uid() = user_id);

-- ─── RPCs ────────────────────────────────────────────────────────────────────

-- A3: Create league
create or replace function create_league(p_name text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_league leagues;
  v_code text;
  v_attempt int := 0;
begin
  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from leagues where invite_code = v_code);
    v_attempt := v_attempt + 1;
    if v_attempt > 10 then raise exception 'code_gen_failed'; end if;
  end loop;

  insert into leagues (name, invite_code, created_by)
  values (p_name, v_code, auth.uid())
  returning * into v_league;

  insert into league_members (league_id, user_id)
  values (v_league.id, auth.uid());

  return jsonb_build_object(
    'id', v_league.id,
    'name', v_league.name,
    'invite_code', v_league.invite_code
  );
end;
$$;

-- A3: Join league by invite code
create or replace function join_league(p_invite_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_league leagues;
begin
  select * into v_league from leagues where invite_code = upper(p_invite_code);
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  if exists (
    select 1 from league_members
    where league_id = v_league.id and user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', true, 'league_id', v_league.id, 'already_member', true);
  end if;

  insert into league_members (league_id, user_id) values (v_league.id, auth.uid());
  return jsonb_build_object('ok', true, 'league_id', v_league.id, 'name', v_league.name);
end;
$$;

-- A3: Get user's leagues
create or replace function get_my_leagues()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'invite_code', l.invite_code,
        'is_creator', l.created_by = auth.uid(),
        'member_count', (select count(*) from league_members lm2 where lm2.league_id = l.id)
      )
    )
    from leagues l
    join league_members lm on l.id = lm.league_id and lm.user_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

-- A3: Get league leaderboard (only members can see)
create or replace function get_league_leaderboard(p_league_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from league_members where league_id = p_league_id and user_id = auth.uid()
  ) then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'user_id', p.id,
        'name', p.name,
        'handle', p.handle,
        'avatar', p.avatar_url,
        'xp', p.xp,
        'division', p.division,
        'accuracy', p.accuracy,
        'is_me', p.id = auth.uid()
      )
      order by p.xp desc
    )
    from profiles p
    join league_members lm on p.id = lm.user_id and lm.league_id = p_league_id
  ), '[]'::jsonb);
end;
$$;

-- A3: Leave league
create or replace function leave_league(p_league_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  delete from league_members where league_id = p_league_id and user_id = auth.uid();
  return jsonb_build_object('ok', true);
end;
$$;

-- D3: Get today's poll
create or replace function get_today_poll()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_poll daily_polls;
  v_voted boolean;
  v_my_vote boolean;
begin
  select * into v_poll from daily_polls where poll_date = current_date;
  if not found then return null; end if;

  select exists(
    select 1 from poll_votes where poll_id = v_poll.id and user_id = auth.uid()
  ) into v_voted;

  if v_voted then
    select vote into v_my_vote
    from poll_votes where poll_id = v_poll.id and user_id = auth.uid();
  end if;

  return jsonb_build_object(
    'id', v_poll.id,
    'question', v_poll.question,
    'yes_count', v_poll.yes_count,
    'no_count', v_poll.no_count,
    'voted', v_voted,
    'my_vote', v_my_vote
  );
end;
$$;

-- D3: Vote on today's poll (+10 XP)
create or replace function vote_daily_poll(p_vote boolean)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_poll daily_polls;
begin
  select * into v_poll from daily_polls where poll_date = current_date;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_poll_today');
  end if;

  if exists (
    select 1 from poll_votes where poll_id = v_poll.id and user_id = auth.uid()
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_voted');
  end if;

  insert into poll_votes (poll_id, user_id, vote) values (v_poll.id, auth.uid(), p_vote);

  if p_vote then
    update daily_polls set yes_count = yes_count + 1 where id = v_poll.id;
  else
    update daily_polls set no_count = no_count + 1 where id = v_poll.id;
  end if;

  update profiles set xp = xp + 10 where id = auth.uid();

  return jsonb_build_object('ok', true, 'xp', 10);
end;
$$;

-- A5: Get currently active events
create or replace function get_active_events()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', id,
      'name', name,
      'slug', slug,
      'description', description,
      'badge_icon', badge_icon,
      'xp_boost', xp_boost,
      'ends_at', ends_at
    ))
    from platform_events
    where now() between starts_at and ends_at
    order by ends_at asc
  ), '[]'::jsonb);
end;
$$;

-- ─── Seed ────────────────────────────────────────────────────────────────────

insert into platform_events (name, slug, description, starts_at, ends_at, badge_icon, xp_boost)
values
  (
    'Semana do Trânsito SP',
    'semana-transito-sp',
    'XP bônus em todos os mercados de Congestionamento. Mostre que você conhece as vias!',
    now(),
    now() + interval '7 days',
    '🚦',
    50
  ),
  (
    'Período de Rodízio Municipal',
    'rodizio-municipal',
    'Mercados especiais de Velocidade ativos — mais difíceis, mais XP.',
    now(),
    now() + interval '3 days',
    '🚗',
    25
  )
on conflict (slug) do nothing;

insert into daily_polls (question, poll_date)
values ('Vai chover em São Paulo hoje à tarde?', current_date)
on conflict (poll_date) do nothing;
