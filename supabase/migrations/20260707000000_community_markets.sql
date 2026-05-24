-- Community markets: user-created yes/no predictions (public or link-private)

alter table public.markets
  add column if not exists market_kind text not null default 'platform'
    check (market_kind in ('platform', 'community')),
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'unlisted')),
  add column if not exists access_token text unique,
  add column if not exists resolution_mode text not null default 'creator'
    check (resolution_mode in ('creator', 'admin'));

update public.markets set market_kind = 'platform' where market_kind is null;

create index if not exists markets_community_public_idx
  on public.markets (created_at desc)
  where market_kind = 'community' and visibility = 'public' and coalesce(archived, false) = false;

create index if not exists markets_access_token_idx
  on public.markets (access_token)
  where access_token is not null;

-- ---------------------------------------------------------------------------
-- market_access — users who opened a private link
-- ---------------------------------------------------------------------------
create table if not exists public.market_access (
  market_id text not null references public.markets(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (market_id, user_id)
);

alter table public.market_access enable row level security;

create policy "market_access_select_own"
  on public.market_access for select
  to authenticated
  using (user_id = auth.uid());

create policy "market_access_insert_own"
  on public.market_access for insert
  to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: hide unlisted community from broad catalog reads
-- ---------------------------------------------------------------------------
drop policy if exists "markets_read_all" on public.markets;
create policy "markets_read_all"
  on public.markets for select
  to authenticated
  using (
    coalesce(archived, false) = false
    and (
      coalesce(market_kind, 'platform') = 'platform'
      or (market_kind = 'community' and visibility = 'public')
      or (market_kind = 'community' and created_by = auth.uid())
      or exists (
        select 1 from public.market_access ma
        where ma.market_id = markets.id and ma.user_id = auth.uid()
      )
    )
  );

drop policy if exists "markets_read_anon" on public.markets;
create policy "markets_read_anon"
  on public.markets for select
  to anon
  using (
    coalesce(archived, false) = false
    and (
      coalesce(market_kind, 'platform') = 'platform'
      or (market_kind = 'community' and visibility = 'public')
    )
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.community_market_row_to_json(m public.markets)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', m.id,
    'question', m.question,
    'region', m.region,
    'region_id', m.region_id,
    'target', m.target,
    'category', m.category,
    'ends_at', m.ends_at,
    'pool_yes', m.pool_yes,
    'pool_no', m.pool_no,
    'participants', m.participants,
    'trend', m.trend,
    'ai_side', m.ai_side,
    'ai_value', m.ai_value,
    'ai_confidence', m.ai_confidence,
    'status', m.status,
    'accept_bets', m.accept_bets,
    'frozen', m.frozen,
    'resolved', m.resolved,
    'archived', coalesce(m.archived, false),
    'market_kind', m.market_kind,
    'visibility', m.visibility,
    'created_by', m.created_by,
    'resolution_mode', m.resolution_mode,
    'has_access_token', m.access_token is not null
  );
$$;

create or replace function public.assert_community_market_access(
  p_market public.markets,
  p_user_id uuid,
  p_access_token text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_market.market_kind is distinct from 'community' then
    return true;
  end if;
  if p_market.visibility = 'public' then
    return true;
  end if;
  if p_user_id is not null and p_market.created_by = p_user_id then
    return true;
  end if;
  if p_user_id is not null and exists (
    select 1 from public.market_access ma
    where ma.market_id = p_market.id and ma.user_id = p_user_id
  ) then
    return true;
  end if;
  if p_access_token is not null
    and p_market.access_token is not null
    and p_market.access_token = p_access_token then
    return true;
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_community_market
-- ---------------------------------------------------------------------------
create or replace function public.create_community_market(
  p_question text,
  p_ends_at timestamptz,
  p_visibility text default 'public'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id text;
  v_token text;
  v_active int;
  v_vis text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;

  v_vis := lower(trim(coalesce(p_visibility, 'public')));
  if v_vis not in ('public', 'unlisted') then
    raise exception 'invalid_visibility';
  end if;

  if length(trim(p_question)) < 10 or length(trim(p_question)) > 280 then
    raise exception 'question_length_invalid';
  end if;

  if p_ends_at is null or p_ends_at <= now() + interval '1 hour' then
    raise exception 'ends_at_too_soon';
  end if;
  if p_ends_at > now() + interval '90 days' then
    raise exception 'ends_at_too_far';
  end if;

  select count(*) into v_active
  from public.markets
  where created_by = v_uid
    and market_kind = 'community'
    and status in ('live', 'closing', 'closed');

  if v_active >= 10 then
    raise exception 'community_market_limit';
  end if;

  v_id := 'cm-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  if v_vis = 'unlisted' then
    v_token := replace(gen_random_uuid()::text, '-', '');
  end if;

  insert into public.markets (
    id, question, region, target, category, ends_at,
    status, accept_bets, pool_yes, pool_no, participants, trend,
    ai_side, ai_value, ai_confidence,
    data_source, resolution_metric, comparison_op, region_id,
    market_kind, created_by, visibility, access_token, resolution_mode,
    starts_at
  ) values (
    v_id,
    trim(p_question),
    'Comunidade',
    0,
    'Evento'::market_category,
    p_ends_at,
    'live',
    true,
    0,
    0,
    0,
    0,
    'YES'::bet_side,
    0,
    0.5,
    'manual',
    null,
    null,
    null,
    'community',
    v_uid,
    v_vis,
    v_token,
    'creator',
    now()
  );

  insert into public.market_access (market_id, user_id)
  values (v_id, v_uid)
  on conflict do nothing;

  return jsonb_build_object(
    'market_id', v_id,
    'visibility', v_vis,
    'access_token', v_token,
    'status', 'live'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- join_community_market
-- ---------------------------------------------------------------------------
create or replace function public.join_community_market(p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;
  if p_access_token is null or length(trim(p_access_token)) < 8 then
    raise exception 'invalid_token';
  end if;

  select * into v_market
  from public.markets
  where access_token = trim(p_access_token)
    and market_kind = 'community'
    and visibility = 'unlisted';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;

  insert into public.market_access (market_id, user_id)
  values (v_market.id, v_uid)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'market_id', v_market.id,
    'question', v_market.question
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_community_market
-- ---------------------------------------------------------------------------
create or replace function public.get_community_market(
  p_market_id text,
  p_access_token text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  select * into v_market from public.markets where id = p_market_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_market.market_kind is distinct from 'community' then
    return jsonb_build_object('ok', false, 'reason', 'not_community');
  end if;

  if not public.assert_community_market_access(v_market, v_uid, p_access_token) then
    return jsonb_build_object('ok', false, 'reason', 'access_denied');
  end if;

  if v_uid is not null
    and p_access_token is not null
    and v_market.access_token = p_access_token then
    insert into public.market_access (market_id, user_id)
    values (v_market.id, v_uid)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'market', public.community_market_row_to_json(v_market),
    'is_creator', v_uid is not null and v_market.created_by = v_uid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- list_public_community_markets / list_my_community_markets
-- ---------------------------------------------------------------------------
create or replace function public.list_public_community_markets(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(public.community_market_row_to_json(m) order by m.created_at desc)
    from (
      select * from public.markets
      where market_kind = 'community'
        and visibility = 'public'
        and coalesce(archived, false) = false
      order by created_at desc
      limit greatest(1, least(p_limit, 100))
    ) m
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_my_community_markets()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  return coalesce((
    select jsonb_agg(public.community_market_row_to_json(m) order by m.created_at desc)
    from public.markets m
    where m.market_kind = 'community'
      and coalesce(m.archived, false) = false
      and (
        m.created_by = v_uid
        or exists (
          select 1 from public.market_access ma
          where ma.market_id = m.id and ma.user_id = v_uid
        )
      )
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- resolve / void community market
-- ---------------------------------------------------------------------------
create or replace function public.resolve_community_market(
  p_market_id text,
  p_winning_side bet_side
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;
  if v_market.created_by is distinct from v_uid then
    raise exception 'creator_only';
  end if;
  if v_market.ends_at > now() then
    raise exception 'market_still_open';
  end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'already_terminal';
  end if;

  if v_market.status in ('live', 'closing') then
    update public.markets
    set status = 'closed', accept_bets = false, updated_at = now()
    where id = p_market_id;
  end if;

  return public.settle_market(p_market_id, p_winning_side);
end;
$$;

create or replace function public.void_community_market(
  p_market_id text,
  p_reason text default 'voided_by_creator'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
  v_admin boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_market from public.markets where id = p_market_id;
  if not found then raise exception 'Market not found'; end if;
  if v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;

  select coalesce(is_admin, false) into v_admin from public.profiles where id = v_uid;
  if v_market.created_by is distinct from v_uid and not v_admin then
    raise exception 'forbidden';
  end if;

  return public.refund_market(p_market_id, coalesce(nullif(trim(p_reason), ''), 'void'));
end;
$$;

-- ---------------------------------------------------------------------------
-- place_bet — community guards
-- ---------------------------------------------------------------------------
create or replace function public.place_bet(
  p_market_id text,
  p_side      bet_side,
  p_stake     numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_market       markets%rowtype;
  v_profile      profiles%rowtype;
  v_new_pool_yes numeric;
  v_new_pool_no  numeric;
  v_share        numeric;
  v_bet_id       uuid;
  v_tx_id        uuid;
  v_recent_bets  int;
  v_label        text;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;
  if p_stake > 100000 then
    raise exception 'Stake cannot exceed 100.000 BRL';
  end if;

  select count(*) into v_recent_bets
  from public.bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';

  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 bets per minute';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  if v_profile.balance < p_stake then
    raise exception 'Insufficient balance';
  end if;

  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if coalesce(v_market.market_kind, 'platform') = 'community' then
    if not public.is_user_registered(v_user_id) then
      raise exception 'registration_required';
    end if;
    if v_market.created_by = v_user_id then
      raise exception 'creator_cannot_bet';
    end if;
    if v_market.visibility = 'unlisted' then
      if not exists (
        select 1 from public.market_access ma
        where ma.market_id = p_market_id and ma.user_id = v_user_id
      ) then
        raise exception 'market_access_denied';
      end if;
    end if;
  end if;

  if v_market.frozen then
    raise exception 'Market is frozen';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  if not v_market.accept_bets then
    raise exception 'Market closed for entries';
  end if;

  if v_market.ends_at is not null and v_market.ends_at < now() then
    raise exception 'Market % deadline has passed (ended %)', p_market_id, v_market.ends_at;
  end if;

  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  v_label := case
    when v_market.market_kind = 'community' then left(v_market.question, 80)
    else v_market.region
  end;

  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes     = v_new_pool_yes,
      pool_no      = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_label, p_stake,
    v_profile.balance,
    v_profile.balance - p_stake
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'bet_id',   v_bet_id,
    'tx_id',    v_tx_id,
    'pool_yes', v_new_pool_yes,
    'pool_no',  v_new_pool_no,
    'balance',  v_profile.balance - p_stake
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- tick_market_lifecycle — skip oracle auto-resolve for community
-- ---------------------------------------------------------------------------
create or replace function public.tick_market_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    record;
  v_closed int := 0;
  v_resolved int := 0;
  v_closing int := 0;
  v_snaps  int := 0;
begin
  v_snaps := public.ingest_oracle_snapshots();

  update public.markets
  set status = 'closing', updated_at = now()
  where status = 'live' and accept_bets = true
    and ends_at > now()
    and ends_at <= now() + interval '30 minutes';
  get diagnostics v_closing = row_count;

  update public.markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where status in ('live', 'closing') and ends_at <= now();
  get diagnostics v_closed = row_count;

  for v_row in
    select id from public.markets
    where status = 'closed'
      and coalesce(market_kind, 'platform') = 'platform'
    for update skip locked
  loop
    perform public.process_market_resolution(v_row.id);
    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'snapshots', v_snaps,
    'closing_promoted', v_closing,
    'closed', v_closed,
    'processed', v_resolved
  );
end;
$$;

grant execute on function public.create_community_market(text, timestamptz, text) to authenticated;
grant execute on function public.join_community_market(text) to authenticated;
grant execute on function public.get_community_market(text, text) to authenticated;
grant execute on function public.list_public_community_markets(int) to authenticated, anon;
grant execute on function public.list_my_community_markets() to authenticated;
grant execute on function public.resolve_community_market(text, bet_side) to authenticated;
grant execute on function public.void_community_market(text, text) to authenticated;
