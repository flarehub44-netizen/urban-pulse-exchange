-- Resolution hardening: oracle sanity from history, profile stats, security, admin freeze

-- ---------------------------------------------------------------------------
-- Recalculate accuracy / ROI after settlement for all bettors on market
-- ---------------------------------------------------------------------------
create or replace function public.refresh_profile_stats(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wins   int;
  v_total  int;
  v_staked numeric;
  v_returned numeric;
begin
  select
    count(*) filter (where b.payout is not null and b.payout > 0),
    count(*),
    coalesce(sum(b.stake), 0),
    coalesce(sum(b.payout), 0)
  into v_wins, v_total, v_staked, v_returned
  from public.bets b
  inner join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
    and m.status in ('settled', 'resolved', 'void');

  if v_total = 0 then
    return;
  end if;

  update public.profiles
  set
    accuracy = round(v_wins::numeric / v_total, 4),
    roi = case when v_staked > 0 then round((v_returned - v_staked) / v_staked, 4) else 0 end
  where id = p_user_id;
end;
$$;

create or replace function public.refresh_market_participant_stats(p_market_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  for v_uid in
    select distinct user_id from public.bets where market_id = p_market_id
  loop
    perform public.refresh_profile_stats(v_uid);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Oracle: tie → dispute; sanity from market_history avg when available
-- ---------------------------------------------------------------------------
create or replace function public.validate_oracle_reading(
  p_market_id text,
  p_resolution_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_res    market_resolutions%rowtype;
  v_checks jsonb := '{}'::jsonb;
  v_pass   boolean := true;
  v_sanity numeric;
  v_hist_avg numeric;
  v_hist_n   int;
begin
  select * into v_market from public.markets where id = p_market_id;
  select * into v_res from public.market_resolutions where id = p_resolution_id;

  if v_res.raw_value is null then
    v_checks := v_checks || jsonb_build_object('consistency', false);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('consistency', true);
  end if;

  -- Exact tie on threshold → dispute
  if v_res.raw_value is not null and v_res.raw_value = v_market.target then
    v_checks := v_checks || jsonb_build_object('tie', true);
    v_pass := false;
  else
    v_checks := v_checks || jsonb_build_object('tie', false);
  end if;

  select avg(p), count(*) into v_hist_avg, v_hist_n
  from public.market_history
  where market_id = p_market_id
    and recorded_at >= now() - interval '7 days';

  if v_hist_n >= 3 and v_hist_avg is not null then
    v_checks := v_checks || jsonb_build_object(
      'crowd_avg_p', v_hist_avg,
      'crowd_samples', v_hist_n
    );
    if abs(v_hist_avg - 0.5) > 0.25
       and (v_hist_avg > 0.5) is distinct from (v_res.derived_side = 'YES') then
      v_checks := v_checks || jsonb_build_object('crowd_conflict', true, 'sanity', false);
      v_pass := false;
    else
      v_checks := v_checks || jsonb_build_object('crowd_conflict', false);
    end if;
  end if;

  if v_market.ai_value > 0 then
    v_sanity := abs(v_res.raw_value - v_market.ai_value) / v_market.ai_value;
    v_checks := v_checks || jsonb_build_object(
      'sanity_source', 'ai_value',
      'sanity_ratio', v_sanity,
      'sanity', v_sanity <= 0.4
    );
    if v_sanity > 0.4 then v_pass := false; end if;
  else
    v_checks := v_checks || jsonb_build_object('sanity', true);
  end if;

  v_checks := v_checks || jsonb_build_object(
    'confidence', coalesce(v_res.confidence, 0) >= public.min_oracle_confidence(),
    'confidence_value', v_res.confidence
  );
  if coalesce(v_res.confidence, 0) < public.min_oracle_confidence() then
    v_pass := false;
  end if;

  update public.market_resolutions
  set validation = v_checks,
      status = case when v_pass then 'validated' else 'disputed' end
  where id = p_resolution_id;

  return jsonb_build_object('pass', v_pass, 'checks', v_checks);
end;
$$;

-- Demo: nudge region telemetry slightly toward market target during resolving window
create or replace function public.sync_region_telemetry_for_market(p_market_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_jitter numeric;
begin
  select * into v_market from public.markets where id = p_market_id;
  if v_market.region_id is null then return; end if;

  v_jitter := (random() * 0.08) - 0.04;

  case coalesce(v_market.resolution_metric, 'flow')
    when 'avg_speed' then
      update public.regions
      set avg_speed = greatest(1, v_market.target * (1 + v_jitter)),
          updated_at = now()
      where id = v_market.region_id;
    when 'congestion' then
      update public.regions
      set congestion = least(1, greatest(0, 0.5 + v_jitter)),
          updated_at = now()
      where id = v_market.region_id;
    else
      update public.regions
      set flow = greatest(0, round(v_market.target * (1 + v_jitter))::int),
          updated_at = now()
      where id = v_market.region_id;
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- settle_market: losers payout=0, refresh stats
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
  v_market     markets%rowtype;
  v_action     text;
  v_prize      numeric;
  v_pool_win   numeric;
  v_fee        numeric;
  v_bet        record;
  v_payout     numeric;
  v_paid       int := 0;
  v_paid_total numeric := 0;
  v_losing     bet_side;
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
    v_losing := 'NO';
  else
    v_pool_win := v_market.pool_no;
    v_losing := 'YES';
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status = 'settled',
      resolved = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id, v_fee, 'house_fee',
      jsonb_build_object(
        'pool_yes', v_market.pool_yes,
        'pool_no', v_market.pool_no,
        'house_fee_pct', v_market.house_fee_pct
      )
    );
  end if;

  update public.bets
  set payout = 0
  where market_id = p_market_id
    and side = v_losing
    and payout is null;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id
      and b.side = p_winning_side
      and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
    update public.bets set payout = v_payout where id = v_bet.id;
    update public.profiles
    set balance = balance + v_payout,
        pnl = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id;
    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout);
    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Payout de ' || v_payout::text || ' no mercado ' || v_market.region,
      p_market_id
    );
    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side,
          'prize_pool', v_prize,
          'house_fee', v_fee,
          'payouts', v_paid,
          'total_paid', v_paid_total
        )
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (
      market_id, status, derived_side, source, payout_summary
    ) values (
      p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object(
        'winning_side', p_winning_side,
        'prize_pool', v_prize,
        'house_fee', v_fee,
        'payouts', v_paid,
        'total_paid', v_paid_total
      )
    );
  end if;

  perform public.refresh_market_participant_stats(p_market_id);

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'settled',
    'winning_side', p_winning_side,
    'prize_pool', v_prize,
    'house_fee', v_fee,
    'payouts', v_paid
  );
end;
$$;

-- Sync telemetry before oracle read
create or replace function public.process_market_resolution(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_reading jsonb;
  v_val     jsonb;
  v_res_id  uuid;
  v_side    bet_side;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;

  if v_market.status not in ('closed', 'resolving') then
    return jsonb_build_object('skipped', true, 'status', v_market.status);
  end if;

  update public.markets
  set status = 'resolving', accept_bets = false, updated_at = now()
  where id = p_market_id;

  perform public.sync_region_telemetry_for_market(p_market_id);

  v_reading := public.collect_oracle_reading(p_market_id);

  if v_reading ? 'error' then
    update public.markets set status = 'void', updated_at = now() where id = p_market_id;
    return public.refund_market(p_market_id, v_reading->>'error');
  end if;

  v_res_id := (v_reading->>'resolution_id')::uuid;
  v_val := public.validate_oracle_reading(p_market_id, v_res_id);

  if not (v_val->>'pass')::boolean then
    update public.markets set status = 'dispute', updated_at = now() where id = p_market_id;
    return jsonb_build_object('market_id', p_market_id, 'status', 'dispute', 'validation', v_val);
  end if;

  select derived_side into v_side
  from public.market_resolutions where id = v_res_id;

  return public.settle_market(p_market_id, v_side, v_res_id);
end;
$$;

-- Admin freeze / unfreeze
create or replace function public.admin_set_market_frozen(
  p_market_id text,
  p_frozen boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;

  update public.markets
  set frozen = p_frozen, updated_at = now()
  where id = p_market_id;

  return jsonb_build_object('market_id', p_market_id, 'frozen', p_frozen, 'note', p_note);
end;
$$;

grant execute on function public.admin_set_market_frozen(text, boolean, text) to authenticated;

-- Only service_role may trigger lifecycle (cron uses postgres role)
revoke execute on function public.refresh_market_lifecycle() from authenticated;
revoke execute on function public.refresh_market_lifecycle() from anon;
