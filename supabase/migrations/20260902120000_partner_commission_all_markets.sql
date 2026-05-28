-- Partner commission on urban (bets) and football (football_bets) markets.

alter table public.partner_commission_ledger
  drop constraint if exists partner_commission_ledger_market_id_fkey;

alter table public.platform_ledger
  drop constraint if exists platform_ledger_market_id_fkey;

drop function if exists public.allocate_partner_commissions(text, numeric);

create or replace function public.allocate_partner_commissions(
  p_market_id text,
  p_house_fee numeric,
  p_source text default 'urban'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text := lower(trim(coalesce(p_source, 'urban')));
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
  if v_source not in ('urban', 'football') then
    raise exception 'Invalid commission source: %', p_source;
  end if;

  if not public.is_partner_program_enabled() or p_house_fee <= 0 then return; end if;

  if v_source = 'football' then
    select house_fee_pct into v_house_fee_pct
    from public.football_markets
    where id = p_market_id;
  else
    select house_fee_pct into v_house_fee_pct
    from public.markets
    where id = p_market_id;
  end if;

  if v_house_fee_pct is null or v_house_fee_pct <= 0 then return; end if;

  v_override_pct := public.partner_setting_num('sub_override_pct', 0.10);

  if v_source = 'football' then
    for v_rec in
      select ur.partner_id, coalesce(sum(b.stake), 0) as referred_vol
      from public.football_bets b
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
          'source', v_source,
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
        jsonb_build_object('amount', v_commission, 'market_id', p_market_id, 'source', v_source)
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
            jsonb_build_object('sub_partner_id', v_rec.partner_id, 'source', v_source, 'model', 'rake_on_referred_stakes')
          );
          update public.partner_accounts
          set balance = balance + v_override_amt, updated_at = now()
          where user_id = v_parent;
        end if;
      end if;
    end loop;
  else
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
          'source', v_source,
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
        jsonb_build_object('amount', v_commission, 'market_id', p_market_id, 'source', v_source)
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
            jsonb_build_object('sub_partner_id', v_rec.partner_id, 'source', v_source, 'model', 'rake_on_referred_stakes')
          );
          update public.partner_accounts
          set balance = balance + v_override_amt, updated_at = now()
          where user_id = v_parent;
        end if;
      end if;
    end loop;
  end if;
end;
$$;

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

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (
      p_market_id,
      v_fee,
      'house_fee',
      jsonb_build_object(
        'source', 'football',
        'pool_home', v_m.pool_home,
        'pool_draw', v_m.pool_draw,
        'pool_away', v_m.pool_away,
        'house_fee_pct', v_m.house_fee_pct
      )
    );
    perform public.allocate_partner_commissions(p_market_id, v_fee, 'football');
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
    update public.profiles set balance = balance + v_payout where id = v_bet.user_id;

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
