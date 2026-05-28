-- Partner commission: rake on referred stakes only (not pool share).
-- Restore allocate_partner_commissions call in settle_market (regression fix).

create or replace function public.allocate_partner_commissions(
  p_market_id text,
  p_house_fee numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_fee_pct numeric;
  v_rec record;
  v_partner partner_accounts%rowtype;
  v_rake_from_referred numeric;
  v_commission numeric;
  v_boost numeric := 1;
  v_override_pct numeric;
  v_override_amt numeric;
  v_parent uuid;
begin
  if not public.is_partner_program_enabled() or p_house_fee <= 0 then return; end if;

  select house_fee_pct into v_house_fee_pct
  from public.markets
  where id = p_market_id;

  if v_house_fee_pct is null or v_house_fee_pct <= 0 then return; end if;

  v_override_pct := public.partner_setting_num('sub_override_pct', 0.10);

  for v_rec in
    select ur.partner_id, coalesce(sum(b.stake), 0) as referred_vol
    from public.bets b
    inner join public.user_referrals ur on ur.user_id = b.user_id
    where b.market_id = p_market_id
    group by ur.partner_id
    having sum(b.stake) > 0
  loop
    select * into v_partner from public.partner_accounts
    where user_id = v_rec.partner_id and status = 'active';
    if not found then continue; end if;

    if v_partner.commission_boost_until is not null and v_partner.commission_boost_until > now() then
      v_boost := 1 + v_partner.commission_boost_pct;
    else
      v_boost := 1;
    end if;

    v_rake_from_referred := round(v_rec.referred_vol * v_house_fee_pct, 2);
    v_commission := round(v_rake_from_referred * v_partner.revenue_share_pct * v_boost, 2);
    if v_commission <= 0 then continue; end if;

    insert into public.partner_commission_ledger (partner_id, market_id, amount, rake_base, referred_volume, meta)
    values (
      v_rec.partner_id,
      p_market_id,
      v_commission,
      p_house_fee,
      v_rec.referred_vol,
      jsonb_build_object(
        'model', 'rake_on_referred_stakes',
        'house_fee_pct', v_house_fee_pct,
        'rake_from_referred', v_rake_from_referred,
        'boost', v_boost
      )
    );

    update public.partner_accounts
    set balance = balance + v_commission, updated_at = now()
    where user_id = v_rec.partner_id;

    perform public.emit_partner_event(
      v_rec.partner_id, 'commission',
      'Comissão de R$ ' || v_commission::text || ' no mercado ' || p_market_id,
      jsonb_build_object('amount', v_commission, 'market_id', p_market_id)
    );

    select parent_partner_id into v_parent from public.partner_accounts where user_id = v_rec.partner_id;
    if v_parent is not null then
      v_override_amt := round(v_commission * v_override_pct, 2);
      if v_override_amt > 0 then
        insert into public.partner_commission_ledger (partner_id, market_id, amount, rake_base, referred_volume, kind, meta)
        values (
          v_parent,
          p_market_id,
          v_override_amt,
          p_house_fee,
          v_rec.referred_vol,
          'sub_override',
          jsonb_build_object('sub_partner_id', v_rec.partner_id, 'model', 'rake_on_referred_stakes')
        );
        update public.partner_accounts
        set balance = balance + v_override_amt, updated_at = now()
        where user_id = v_parent;
      end if;
    end if;
  end loop;
end;
$$;

-- settle_market: restore partner commission allocation after house_fee ledger
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
    perform public.allocate_partner_commissions(p_market_id, v_fee);
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
