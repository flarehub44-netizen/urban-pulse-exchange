-- Align football settlement with binary settlement:
--   1) update profiles.pnl alongside balance
--   2) record house_fee in platform_ledger

create or replace function public.settle_football_market(
  p_market_id text,
  p_winning public.football_outcome,
  p_goals_home int default null,
  p_goals_away int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.football_markets%rowtype;
  v_action text;
  v_total numeric;
  v_pool_win numeric;
  v_prize numeric;
  v_fee numeric;
  v_bet record;
  v_payout numeric;
  v_paid int := 0;
  v_paid_total numeric := 0;
  v_label text;
begin
  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status in ('settled', 'void') then
    return jsonb_build_object('market_id', p_market_id, 'already_terminal', true, 'status', v_m.status);
  end if;

  v_action := public.validate_football_pools(v_m.pool_home, v_m.pool_draw, v_m.pool_away, p_winning);
  if v_action = 'void' then
    return public.refund_football_market(p_market_id, 'pool_validation_failed');
  end if;

  v_pool_win := case p_winning
    when 'HOME' then v_m.pool_home
    when 'DRAW' then v_m.pool_draw
    when 'AWAY' then v_m.pool_away
  end;

  v_total := v_m.pool_home + v_m.pool_draw + v_m.pool_away;
  v_prize := v_total * (1 - v_m.house_fee_pct);
  v_fee := v_total * v_m.house_fee_pct;
  v_label := v_m.question;

  update public.football_markets
  set status = 'settled',
      winning_outcome = p_winning,
      accept_bets = false,
      resolved_at = now(),
      settled_at = now(),
      updated_at = now()
  where id = p_market_id;

  -- House fee → platform_ledger (parity with settle_market)
  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id,
      v_fee,
      'house_fee',
      jsonb_build_object(
        'pool_home', v_m.pool_home,
        'pool_draw', v_m.pool_draw,
        'pool_away', v_m.pool_away,
        'house_fee_pct', v_m.house_fee_pct,
        'market_kind', 'football'
      )
    );
  end if;

  update public.football_bets
  set payout = 0
  where market_id = p_market_id
    and outcome is distinct from p_winning
    and payout is null;

  for v_bet in
    select b.id, b.user_id, b.stake, b.share
    from public.football_bets b
    where b.market_id = p_market_id
      and b.outcome = p_winning
      and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
    update public.football_bets set payout = v_payout where id = v_bet.id;

    -- Update both balance AND pnl (parity with settle_market)
    update public.profiles
    set balance = balance + v_payout,
        pnl = coalesce(pnl, 0) + (v_payout - v_bet.stake)
    where id = v_bet.user_id;

    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'payout', p_market_id, v_label, v_payout);

    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Você ganhou ' || v_payout::text || ' BRL em ' || v_label,
      p_market_id
    );

    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  insert into public.football_market_resolutions (
    market_id, status, winning_outcome, goals_home, goals_away, payout_summary
  ) values (
    p_market_id, 'settled', p_winning, p_goals_home, p_goals_away,
    jsonb_build_object(
      'winners', v_paid,
      'total_paid', v_paid_total,
      'house_fee', v_fee,
      'prize_pool', v_prize
    )
  );

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'settled',
    'winning_outcome', p_winning,
    'winners', v_paid,
    'total_paid', v_paid_total
  );
end;
$$;