-- P0 Financial Integrity (Semana 1)
-- Fixes:
--   P0-A: before_balance/after_balance snapshots + loss ledger entries para perdedores
--   P0-B: frozen check restaurado em place_bet (regredido em 20260603000000)
--   P0-C: rate limiting em place_bet (máx 10 apostas/60s por usuário)
--   P2-A: tx_type 'loss' e 'bonus' adicionados ao enum

-- ---------------------------------------------------------------------------
-- 1. Enum extensions
-- ---------------------------------------------------------------------------
alter type public.tx_type add value if not exists 'loss';
alter type public.tx_type add value if not exists 'bonus';

-- ---------------------------------------------------------------------------
-- 2. Colunas de snapshot de saldo na tabela transactions
--    Nullable para compatibilidade com linhas existentes.
-- ---------------------------------------------------------------------------
alter table public.transactions
  add column if not exists before_balance numeric(12,2),
  add column if not exists after_balance  numeric(12,2);

-- ---------------------------------------------------------------------------
-- 3. Índice composto para suportar rate-limit query com eficiência
-- ---------------------------------------------------------------------------
create index if not exists bets_user_id_created_at
  on public.bets(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. place_bet — versão consolidada
--    Inclui (em ordem lógica):
--      • lock profile antes do market (evita deadlock)
--      • max stake server-side R$ 100.000 (20260603)
--      • frozen check (20260522000001 — regredido em 20260603)
--      • status in ('live','closing') (20260526000001)
--      • accept_bets flag (20260522000001)
--      • deadline check ends_at (20260603)
--      • rate limit: máx 10 apostas por usuário por minuto (NOVO)
--      • before_balance / after_balance na entry transaction (NOVO)
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
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  -- Stake bounds (server-side — impede bypass do TypeScript)
  if p_stake <= 0 then
    raise exception 'Stake must be positive';
  end if;
  if p_stake > 100000 then
    raise exception 'Stake cannot exceed R$ 100.000';
  end if;

  -- Rate limit: máx 10 apostas por usuário por minuto
  select count(*) into v_recent_bets
  from public.bets
  where user_id = v_user_id
    and created_at > now() - interval '60 seconds';

  if v_recent_bets >= 10 then
    raise exception 'rate_limit_exceeded: maximum 10 bets per minute';
  end if;

  -- Lock profile para evitar race de saldo concorrente
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

  -- Lock market row
  select * into v_market
  from public.markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  -- Frozen check (regredido em 20260603000000 — restaurado aqui)
  if v_market.frozen then
    raise exception 'Market is frozen';
  end if;

  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  if not v_market.accept_bets then
    raise exception 'Market closed for entries';
  end if;

  -- Deadline check: rejeita mesmo se o cron ainda não atualizou o status
  if v_market.ends_at is not null and v_market.ends_at < now() then
    raise exception 'Market % deadline has passed (ended %)', p_market_id, v_market.ends_at;
  end if;

  -- Calcular pools e share
  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  -- Debitar saldo
  update public.profiles
  set balance    = balance - p_stake,
      volume_24h = volume_24h + p_stake
  where id = v_user_id;

  -- Atualizar pools do mercado
  update public.markets
  set pool_yes     = v_new_pool_yes,
      pool_no      = v_new_pool_no,
      participants = participants + 1
  where id = p_market_id;

  -- Registrar aposta
  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  -- Registrar transação com snapshots de saldo
  insert into public.transactions (
    user_id, type, market_id, market_label, amount,
    before_balance, after_balance
  )
  values (
    v_user_id, 'entry', p_market_id, v_market.region, p_stake,
    v_profile.balance,               -- saldo ANTES do débito (capturado no SELECT FOR UPDATE)
    v_profile.balance - p_stake      -- saldo DEPOIS do débito
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
-- 5. settle_market — adiciona entries de loss para perdedores + snapshots
--    Base: 20260522000003_resolution_hardening.sql (versão mais recente)
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

  -- Travar mercado
  update public.markets
  set status      = 'settled',
      resolved    = p_winning_side,
      accept_bets = false,
      resolved_at = now(),
      settled_at  = now(),
      updated_at  = now()
  where id = p_market_id;

  -- House fee no ledger da plataforma
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

  -- Marcar apostas perdedoras como payout=0
  update public.bets
  set payout = 0
  where market_id = p_market_id
    and side      = v_losing
    and payout    is null;

  -- Registrar entry 'loss' para cada perdedor (saldo não muda — já foi debitado no place_bet)
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
    p.balance,   -- saldo atual (stake já deduzido anteriormente)
    p.balance    -- saldo não muda ao registrar a perda
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.market_id = p_market_id
    and b.side      = v_losing;

  -- Processar vencedores
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

    -- Creditar saldo e capturar valor pós-update via RETURNING
    update public.profiles
    set balance = balance + v_payout,
        pnl     = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id
    returning balance into v_balance_after;

    -- Registrar payout com snapshots de saldo
    insert into public.transactions (
      user_id, type, market_id, market_label, amount,
      before_balance, after_balance
    )
    values (
      v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout,
      v_balance_after - v_payout,  -- saldo ANTES do crédito
      v_balance_after              -- saldo DEPOIS do crédito
    );

    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id, 'win',
      'Payout de R$ ' || v_payout::text || ' — ' || v_market.region,
      p_market_id
    );

    v_paid       := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  -- Atualizar / criar registro de resolução
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

  return jsonb_build_object(
    'market_id',    p_market_id,
    'status',       'settled',
    'winning_side', p_winning_side,
    'prize_pool',   v_prize,
    'house_fee',    v_fee,
    'payouts',      v_paid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. wallet_deposit — adiciona snapshots before/after
-- ---------------------------------------------------------------------------
create or replace function public.wallet_deposit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_tx_id       uuid;
  v_balance_after numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 500000 then raise exception 'Amount exceeds limit'; end if;

  update public.profiles
  set balance = balance + p_amount
  where id = v_uid
  returning balance into v_balance_after;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'deposit', p_amount, 'Carteira',
    v_balance_after - p_amount,  -- saldo antes do depósito
    v_balance_after              -- saldo após o depósito
  )
  returning id into v_tx_id;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. wallet_withdraw — adiciona snapshots before/after
-- ---------------------------------------------------------------------------
create or replace function public.wallet_withdraw(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_profile     profiles%rowtype;
  v_tx_id       uuid;
  v_balance_after numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_profile
  from public.profiles
  where id = v_uid
  for update;

  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid
  returning balance into v_balance_after;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Carteira',
    v_balance_after + p_amount,  -- saldo antes do saque
    v_balance_after              -- saldo após o saque
  )
  returning id into v_tx_id;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. grant/revoke: manter permissões existentes
-- ---------------------------------------------------------------------------
grant execute on function public.place_bet(text, bet_side, numeric)  to authenticated;
grant execute on function public.wallet_deposit(numeric)              to authenticated;
grant execute on function public.wallet_withdraw(numeric)             to authenticated;
