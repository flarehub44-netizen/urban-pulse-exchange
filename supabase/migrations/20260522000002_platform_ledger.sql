-- Platform house fee ledger (10% retention per settled market)

create table if not exists public.platform_ledger (
  id         uuid primary key default gen_random_uuid(),
  market_id  text not null references public.markets(id) on delete cascade,
  amount     numeric(12,2) not null check (amount >= 0),
  kind       text not null default 'house_fee' check (kind in ('house_fee')),
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists platform_ledger_market_id on public.platform_ledger(market_id);

alter table public.platform_ledger enable row level security;

create policy "platform_ledger_read_authenticated"
  on public.platform_ledger for select
  to authenticated
  using (true);

-- Record house fee on settle
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

  if p_winning_side = 'YES' then v_pool_win := v_market.pool_yes;
  else v_pool_win := v_market.pool_no;
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
      p_market_id,
      v_fee,
      'house_fee',
      jsonb_build_object(
        'pool_yes', v_market.pool_yes,
        'pool_no', v_market.pool_no,
        'house_fee_pct', v_market.house_fee_pct
      )
    );
  end if;

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
