-- Community event impact XP + monthly Top 3 leaderboard

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.event_impact_xp_queue (
  market_id    text primary key references public.markets(id) on delete cascade,
  creator_id   uuid not null references public.profiles(id) on delete cascade,
  eligible_at  timestamptz not null,
  status       text not null default 'pending'
    check (status in ('pending', 'processed', 'skipped')),
  skip_reason  text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists event_impact_xp_queue_pending_idx
  on public.event_impact_xp_queue (eligible_at)
  where status = 'pending';

create table if not exists public.event_impact_xp_ledger (
  id              uuid primary key default gen_random_uuid(),
  market_id       text not null unique references public.markets(id) on delete cascade,
  creator_id      uuid not null references public.profiles(id) on delete cascade,
  period_month    date not null,
  volume_valid    numeric not null default 0,
  unique_bettors  int not null default 0,
  xp_awarded      int not null default 0,
  status          text not null default 'credited'
    check (status in ('credited', 'skipped', 'ineligible')),
  credited_at     timestamptz not null default now(),
  meta            jsonb not null default '{}'::jsonb
);

create index if not exists event_impact_xp_ledger_creator_month_idx
  on public.event_impact_xp_ledger (creator_id, period_month);

create index if not exists event_impact_xp_ledger_month_xp_idx
  on public.event_impact_xp_ledger (period_month, xp_awarded desc);

create table if not exists public.monthly_impact_winners (
  id            uuid primary key default gen_random_uuid(),
  period_month  date not null,
  rank          int not null check (rank between 1 and 3),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  xp_total      int not null,
  prize_label   text not null default 'Prêmio exclusivo ViaX',
  fulfilled_at  timestamptz,
  fulfilled_by  uuid references public.profiles(id) on delete set null,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (period_month, rank),
  unique (period_month, user_id)
);

alter table public.event_impact_xp_queue enable row level security;
alter table public.event_impact_xp_ledger enable row level security;
alter table public.monthly_impact_winners enable row level security;

create policy event_impact_xp_queue_deny on public.event_impact_xp_queue
  for all to authenticated using (false) with check (false);

create policy event_impact_xp_ledger_select_own on public.event_impact_xp_ledger
  for select to authenticated using (creator_id = auth.uid());

create policy monthly_impact_winners_select_all on public.monthly_impact_winners
  for select to authenticated, anon using (true);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public._impact_period_month(p_ts timestamptz default now())
returns date
language sql
stable
as $$
  select date_trunc(
    'month',
    timezone('America/Sao_Paulo', coalesce(p_ts, now()))
  )::date;
$$;

create or replace function public._impact_creator_xp_today(p_creator_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(xp_awarded), 0)::int
  from public.event_impact_xp_ledger
  where creator_id = p_creator_id
    and status = 'credited'
    and (credited_at at time zone 'America/Sao_Paulo')::date
      = (now() at time zone 'America/Sao_Paulo')::date;
$$;

create or replace function public._impact_creator_xp_week(p_creator_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(xp_awarded), 0)::int
  from public.event_impact_xp_ledger
  where creator_id = p_creator_id
    and status = 'credited'
    and credited_at >= (
      date_trunc('week', now() at time zone 'America/Sao_Paulo')
        at time zone 'America/Sao_Paulo'
    );
$$;

-- ---------------------------------------------------------------------------
-- enqueue_event_impact_xp (called from settle_market)
-- ---------------------------------------------------------------------------
create or replace function public.enqueue_event_impact_xp(p_market_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
begin
  select * into v_market from public.markets where id = p_market_id;
  if not found then return; end if;
  if coalesce(v_market.market_kind, 'platform') is distinct from 'community' then return; end if;
  if v_market.created_by is null then return; end if;
  if not public._is_common_user(v_market.created_by) then return; end if;
  if v_market.status is distinct from 'settled' then return; end if;

  insert into public.event_impact_xp_queue (market_id, creator_id, eligible_at, status)
  values (
    p_market_id,
    v_market.created_by,
    coalesce(v_market.settled_at, now()) + interval '6 hours',
    'pending'
  )
  on conflict (market_id) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Compute metrics + XP (returns jsonb, does not credit)
-- ---------------------------------------------------------------------------
create or replace function public._compute_event_impact_xp(p_market_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_market       public.markets%rowtype;
  v_volume       numeric := 0;
  v_unique       int := 0;
  v_top3_volume  numeric := 0;
  v_xp_base      int := 0;
  v_xp           int := 0;
  v_multiplier   numeric := 1.0;
  v_sla_ok       boolean := false;
  v_has_reviewed_report boolean := false;
  v_reason       text;
begin
  select * into v_market from public.markets where id = p_market_id;
  if not found then
    return jsonb_build_object('eligible', false, 'reason', 'market_not_found');
  end if;

  if v_market.status is distinct from 'settled' then
    return jsonb_build_object('eligible', false, 'reason', 'not_settled');
  end if;

  select coalesce(sum(b.stake), 0), count(distinct b.user_id)
  into v_volume, v_unique
  from public.bets b
  join public.profiles p on p.id = b.user_id
  left join public.user_risk_profiles urp on urp.user_id = b.user_id
  where b.market_id = p_market_id
    and b.payout is not null
    and not coalesce(urp.frozen, false);

  if v_volume < 1500 or v_unique < 12 then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'below_minimum',
      'volume_valid', v_volume,
      'unique_bettors', v_unique
    );
  end if;

  select coalesce(sum(t.stake), 0) into v_top3_volume
  from (
    select b.user_id, sum(b.stake) as stake
    from public.bets b
    where b.market_id = p_market_id and b.payout is not null
    group by b.user_id
    order by sum(b.stake) desc
    limit 3
  ) t;

  if v_volume > 0 and (v_top3_volume / v_volume) > 0.70 then
    return jsonb_build_object(
      'eligible', false,
      'reason', 'concentration_limit',
      'volume_valid', v_volume,
      'unique_bettors', v_unique
    );
  end if;

  select exists (
    select 1 from public.market_reports mr
    where mr.market_id = p_market_id and mr.status = 'reviewed'
  ) into v_has_reviewed_report;

  v_sla_ok := (
    v_market.ends_at is not null
    and coalesce(v_market.settled_at, now()) <= v_market.ends_at + interval '24 hours'
  ) or v_market.ends_at is null;

  v_xp_base := round(v_volume * 0.025)::int + (v_unique * 12);
  v_multiplier := 1.0;
  if v_unique >= 30 then v_multiplier := v_multiplier * 1.15; end if;
  if v_sla_ok then v_multiplier := v_multiplier * 1.10; end if;
  if v_has_reviewed_report then v_multiplier := v_multiplier * 0.5; end if;

  v_xp := greatest(0, round(v_xp_base * v_multiplier)::int);
  v_xp := least(v_xp, 2500);

  return jsonb_build_object(
    'eligible', true,
    'volume_valid', v_volume,
    'unique_bettors', v_unique,
    'xp_awarded', v_xp,
    'sla_ok', v_sla_ok,
    'has_reviewed_report', v_has_reviewed_report,
    'multiplier', v_multiplier
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- service_credit_pending_event_impact_xp
-- ---------------------------------------------------------------------------
create or replace function public.service_credit_pending_event_impact_xp(p_limit int default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row          record;
  v_calc         jsonb;
  v_xp           int;
  v_creator      uuid;
  v_month        date;
  v_today_xp     int;
  v_week_xp      int;
  v_processed    int := 0;
  v_skipped      int := 0;
begin
  for v_row in
    select q.market_id, q.creator_id
    from public.event_impact_xp_queue q
    where q.status = 'pending'
      and q.eligible_at <= now()
    order by q.eligible_at
    limit greatest(1, least(coalesce(p_limit, 50), 200))
    for update of q skip locked
  loop
    if exists (
      select 1 from public.event_impact_xp_ledger l where l.market_id = v_row.market_id
    ) then
      update public.event_impact_xp_queue
      set status = 'processed', processed_at = now(), skip_reason = 'already_ledgered'
      where market_id = v_row.market_id;
      continue;
    end if;

    v_calc := public._compute_event_impact_xp(v_row.market_id);
    v_creator := v_row.creator_id;
    v_month := public._impact_period_month(now());

    if not coalesce((v_calc->>'eligible')::boolean, false) then
      insert into public.event_impact_xp_ledger (
        market_id, creator_id, period_month, volume_valid, unique_bettors,
        xp_awarded, status, meta
      ) values (
        v_row.market_id, v_creator, v_month,
        coalesce((v_calc->>'volume_valid')::numeric, 0),
        coalesce((v_calc->>'unique_bettors')::int, 0),
        0, 'ineligible',
        v_calc || jsonb_build_object('skip_reason', v_calc->>'reason')
      );
      update public.event_impact_xp_queue
      set status = 'skipped', processed_at = now(), skip_reason = v_calc->>'reason'
      where market_id = v_row.market_id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_xp := coalesce((v_calc->>'xp_awarded')::int, 0);
    v_today_xp := public._impact_creator_xp_today(v_creator);
    v_week_xp := public._impact_creator_xp_week(v_creator);

    v_xp := least(v_xp, greatest(0, 4000 - v_today_xp));
    v_xp := least(v_xp, greatest(0, 15000 - v_week_xp));

    if v_xp <= 0 then
      insert into public.event_impact_xp_ledger (
        market_id, creator_id, period_month, volume_valid, unique_bettors,
        xp_awarded, status, meta
      ) values (
        v_row.market_id, v_creator, v_month,
        (v_calc->>'volume_valid')::numeric,
        (v_calc->>'unique_bettors')::int,
        0, 'skipped',
        v_calc || jsonb_build_object('skip_reason', 'cap_exceeded')
      );
      update public.event_impact_xp_queue
      set status = 'skipped', processed_at = now(), skip_reason = 'cap_exceeded'
      where market_id = v_row.market_id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    perform public.apply_user_progress(v_creator, 'event_impact', v_xp);

    insert into public.event_impact_xp_ledger (
      market_id, creator_id, period_month, volume_valid, unique_bettors,
      xp_awarded, status, meta
    ) values (
      v_row.market_id, v_creator, v_month,
      (v_calc->>'volume_valid')::numeric,
      (v_calc->>'unique_bettors')::int,
      v_xp, 'credited', v_calc
    );

    update public.event_impact_xp_queue
    set status = 'processed', processed_at = now()
    where market_id = v_row.market_id;

    v_processed := v_processed + 1;
  end loop;

  return jsonb_build_object('processed', v_processed, 'skipped', v_skipped);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_monthly_impact_leaderboard
-- ---------------------------------------------------------------------------
create or replace function public.get_monthly_impact_leaderboard(
  p_month date default null,
  p_limit int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_month   date := coalesce(p_month, public._impact_period_month(now()));
  v_uid     uuid := auth.uid();
  v_my_xp   int := 0;
  v_my_rank int;
begin
  with totals as (
    select
      l.creator_id as user_id,
      sum(l.xp_awarded)::int as impact_xp,
      count(*) filter (where l.xp_awarded > 0) as events_count
    from public.event_impact_xp_ledger l
    where l.period_month = v_month
      and l.status = 'credited'
      and l.xp_awarded > 0
      and public._is_common_user(l.creator_id)
    group by l.creator_id
  ),
  ranked as (
    select
      t.*,
      p.name,
      p.handle,
      p.avatar,
      p.division,
      rank() over (order by t.impact_xp desc, t.events_count desc, t.user_id)
        as position
    from totals t
    join public.profiles p on p.id = t.user_id
  )
  select impact_xp, position into v_my_xp, v_my_rank
  from ranked where user_id = v_uid;

  return jsonb_build_object(
    'period_month', v_month,
    'period_label', to_char(v_month, 'MM/YYYY'),
    'days_left', (
      (date_trunc('month', v_month + interval '1 month')::date - 1)
      - (timezone('America/Sao_Paulo', now()))::date
    ),
    'my_xp', coalesce(v_my_xp, 0),
    'my_rank', v_my_rank,
    'leaderboard', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', r.user_id,
        'name', r.name,
        'handle', r.handle,
        'avatar', r.avatar,
        'division', r.division,
        'impact_xp', r.impact_xp,
        'events_count', r.events_count,
        'rank', r.position
      ) order by r.position)
      from (
        select * from ranked order by position limit greatest(1, least(p_limit, 100))
      ) r
    ), '[]'::jsonb),
    'winners', coalesce((
      select jsonb_agg(jsonb_build_object(
        'rank', w.rank,
        'user_id', w.user_id,
        'name', p.name,
        'handle', p.handle,
        'avatar', p.avatar,
        'xp_total', w.xp_total,
        'prize_label', w.prize_label,
        'fulfilled_at', w.fulfilled_at
      ) order by w.rank)
      from public.monthly_impact_winners w
      join public.profiles p on p.id = w.user_id
      where w.period_month = v_month
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_my_event_impact_summary
-- ---------------------------------------------------------------------------
create or replace function public.get_my_event_impact_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_month date := public._impact_period_month(now());
  v_lb    jsonb;
begin
  if v_uid is null then return '{}'::jsonb; end if;

  v_lb := public.get_monthly_impact_leaderboard(v_month, 3);

  return jsonb_build_object(
    'period_month', v_month,
    'my_xp', coalesce((v_lb->>'my_xp')::int, 0),
    'my_rank', v_lb->'my_rank',
    'days_left', v_lb->'days_left',
    'recent_events', coalesce((
      select jsonb_agg(t.row_data)
      from (
        select jsonb_build_object(
          'market_id', l.market_id,
          'xp_awarded', l.xp_awarded,
          'volume_valid', l.volume_valid,
          'unique_bettors', l.unique_bettors,
          'status', l.status,
          'credited_at', l.credited_at
        ) as row_data
        from public.event_impact_xp_ledger l
        where l.creator_id = v_uid
        order by l.credited_at desc
        limit 5
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- service_finalize_monthly_impact
-- ---------------------------------------------------------------------------
create or replace function public.service_finalize_monthly_impact(p_month date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month    date := coalesce(
    p_month,
    (date_trunc('month', now() at time zone 'America/Sao_Paulo') - interval '1 month')::date
  );
  v_row      record;
  v_labels   text[] := array[
    '1º lugar — Prêmio exclusivo ViaX',
    '2º lugar — Prêmio exclusivo ViaX',
    '3º lugar — Prêmio exclusivo ViaX'
  ];
  v_inserted int := 0;
begin
  if exists (
    select 1 from public.monthly_impact_winners w where w.period_month = v_month
  ) then
    return jsonb_build_object('ok', true, 'already_finalized', true, 'period_month', v_month);
  end if;

  for v_row in
    with totals as (
      select l.creator_id, sum(l.xp_awarded)::int as impact_xp
      from public.event_impact_xp_ledger l
      where l.period_month = v_month
        and l.status = 'credited'
        and l.xp_awarded > 0
        and public._is_common_user(l.creator_id)
      group by l.creator_id
    ),
    ranked as (
      select
        creator_id,
        impact_xp,
        rank() over (order by impact_xp desc, creator_id) as pos
      from totals
    )
    select creator_id, impact_xp, pos::int as rank_pos
    from ranked
    where pos <= 3
    order by pos
  loop
    insert into public.monthly_impact_winners (
      period_month, rank, user_id, xp_total, prize_label
    ) values (
      v_month,
      v_row.rank_pos,
      v_row.creator_id,
      v_row.impact_xp,
      v_labels[v_row.rank_pos]
    );

    perform public.insert_user_notification(
      v_row.creator_id,
      'rank',
      'Parabéns! Você ficou em #' || v_row.rank_pos::text
        || ' no ranking de impacto de ' || to_char(v_month, 'MM/YYYY')
        || '. Prêmio exclusivo ViaX — nossa equipe entrará em contato.',
      null
    );

    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'period_month', v_month,
    'winners_inserted', v_inserted
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: list / fulfill prizes
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_monthly_impact_winners(p_month date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_month date := coalesce(p_month, public._impact_period_month(now()));
begin
  perform public.assert_admin();

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.id,
      'period_month', w.period_month,
      'rank', w.rank,
      'user_id', w.user_id,
      'name', p.name,
      'handle', p.handle,
      'xp_total', w.xp_total,
      'prize_label', w.prize_label,
      'fulfilled_at', w.fulfilled_at,
      'fulfilled_by', w.fulfilled_by,
      'notes', w.notes
    ) order by w.period_month desc, w.rank)
    from public.monthly_impact_winners w
    join public.profiles p on p.id = w.user_id
    where w.period_month = v_month
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_mark_impact_prize_fulfilled(
  p_winner_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
begin
  perform public.assert_admin();

  update public.monthly_impact_winners
  set fulfilled_at = now(),
      fulfilled_by = v_admin,
      notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_winner_id;

  if not found then
    raise exception 'winner_not_found';
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    v_admin,
    'impact_prize_fulfilled',
    'monthly_impact_winner',
    p_winner_id::text,
    jsonb_build_object('notes', p_notes)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- settle_market: enqueue impact XP for community creators
-- ---------------------------------------------------------------------------
create or replace function public.settle_market(
  p_market_id text,
  p_winning_side bet_side,
  p_resolution_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market       markets%rowtype;
  v_action       text;
  v_prize        numeric;
  v_pool_win     numeric;
  v_fee          numeric;
  v_bet          record;
  v_payout       numeric;
  v_paid         int := 0;
  v_paid_total   numeric := 0;
  v_losing       bet_side;
  v_balance_after numeric;
  v_result       jsonb;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'Market already terminal: %', v_market.status;
  end if;

  v_action := public.validate_market_pools(
    v_market.pool_yes, v_market.pool_no, p_winning_side
  );

  if v_action = 'void' then
    return public.refund_market(p_market_id, 'pool_validation_failed');
  end if;

  if p_winning_side = 'YES' then
    v_pool_win := v_market.pool_yes;
    v_losing   := 'NO';
  else
    v_pool_win := v_market.pool_no;
    v_losing   := 'YES';
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee   := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status      = 'settled',
      resolved    = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at  = now(),
      updated_at  = now()
  where id = p_market_id;

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id, v_fee, 'house_fee',
      jsonb_build_object(
        'pool_yes',       v_market.pool_yes,
        'pool_no',        v_market.pool_no,
        'house_fee_pct',  v_market.house_fee_pct
      )
    );
  end if;

  update public.bets
  set payout = 0
  where market_id = p_market_id
    and side      = v_losing
    and payout    is null;

  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  select
    b.user_id,
    'loss'::tx_type,
    p_market_id,
    v_market.region,
    b.stake,
    p.balance,
    p.balance
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.market_id = p_market_id
    and b.side      = v_losing;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id
      and b.side      = p_winning_side
      and b.payout    is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);

    update public.bets
    set payout = v_payout
    where id = v_bet.id;

    update public.profiles
    set balance = balance + v_payout,
        pnl     = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id
    returning balance into v_balance_after;

    insert into public.transactions (
      user_id, type, market_id, market_label, amount,
      before_balance, after_balance
    )
    values (
      v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout,
      v_balance_after - v_payout,
      v_balance_after
    );

    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Payout de ' || v_payout::text || ' BRL — ' || v_market.region,
      p_market_id
    );

    v_paid       := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status        = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side,
          'prize_pool',   v_prize,
          'house_fee',    v_fee,
          'payouts',      v_paid,
          'total_paid',   v_paid_total
        )
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (
      market_id, status, derived_side, source, payout_summary
    ) values (
      p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object(
        'winning_side', p_winning_side,
        'prize_pool',   v_prize,
        'house_fee',    v_fee,
        'payouts',      v_paid,
        'total_paid',   v_paid_total
      )
    );
  end if;

  perform public.refresh_market_participant_stats(p_market_id);
  perform public.enqueue_event_impact_xp(p_market_id);

  v_result := jsonb_build_object(
    'market_id',    p_market_id,
    'status',       'settled',
    'winning_side', p_winning_side,
    'prize_pool',   v_prize,
    'house_fee',    v_fee,
    'payouts',      v_paid
  );

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (service_role for cron; authenticated for reads/admin)
-- ---------------------------------------------------------------------------
revoke all on function public.enqueue_event_impact_xp(text) from public;
grant execute on function public.enqueue_event_impact_xp(text) to service_role;

revoke all on function public.service_credit_pending_event_impact_xp(int) from public;
grant execute on function public.service_credit_pending_event_impact_xp(int) to service_role;

revoke all on function public.service_finalize_monthly_impact(date) from public;
grant execute on function public.service_finalize_monthly_impact(date) to service_role;

revoke all on function public.get_monthly_impact_leaderboard(date, int) from public;
grant execute on function public.get_monthly_impact_leaderboard(date, int) to authenticated, anon;

revoke all on function public.get_my_event_impact_summary() from public;
grant execute on function public.get_my_event_impact_summary() to authenticated;

revoke all on function public.admin_list_monthly_impact_winners(date) from public;
grant execute on function public.admin_list_monthly_impact_winners(date) to authenticated;

revoke all on function public.admin_mark_impact_prize_fulfilled(uuid, text) from public;
grant execute on function public.admin_mark_impact_prize_fulfilled(uuid, text) to authenticated;
