-- P2: idempotency em place_bet, vision worker runs, partner payout status

-- ---------------------------------------------------------------------------
-- bets.idempotency_key
-- ---------------------------------------------------------------------------
alter table public.bets
  add column if not exists idempotency_key text;

create unique index if not exists bets_user_idempotency_unique
  on public.bets (user_id, idempotency_key)
  where idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- place_bet — idempotency (p_idempotency_key)
-- ---------------------------------------------------------------------------
drop function if exists public.place_bet(text, bet_side, numeric);

create or replace function public.place_bet(
  p_market_id text,
  p_side      bet_side,
  p_stake     numeric,
  p_idempotency_key text default null
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
  v_key          text := nullif(trim(coalesce(p_idempotency_key, '')), '');
  v_existing     public.bets%rowtype;
  v_balance      numeric;
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

  if v_key is not null then
    select * into v_existing
    from public.bets
    where user_id = v_user_id and idempotency_key = v_key;

    if found then
      if v_existing.market_id is distinct from p_market_id
        or v_existing.side is distinct from p_side
        or v_existing.stake is distinct from p_stake then
        raise exception 'idempotency_key_conflict';
      end if;

      select pool_yes, pool_no into v_new_pool_yes, v_new_pool_no
      from public.markets where id = v_existing.market_id;

      select balance into v_balance from public.profiles where id = v_user_id;

      select id into v_tx_id
      from public.transactions
      where user_id = v_user_id
        and market_id = v_existing.market_id
        and type = 'entry'
        and amount = v_existing.stake
      order by created_at desc
      limit 1;

      return jsonb_build_object(
        'bet_id',   v_existing.id,
        'tx_id',    v_tx_id,
        'pool_yes', v_new_pool_yes,
        'pool_no',  v_new_pool_no,
        'balance',  v_balance,
        'idempotent', true
      );
    end if;
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

  begin
    insert into public.bets (user_id, market_id, side, stake, share, idempotency_key)
    values (v_user_id, p_market_id, p_side, p_stake, v_share, v_key)
    returning id into v_bet_id;
  exception
    when unique_violation then
      if v_key is null then
        raise;
      end if;
      select * into v_existing
      from public.bets
      where user_id = v_user_id and idempotency_key = v_key;
      if not found then
        raise;
      end if;
      return jsonb_build_object(
        'bet_id',   v_existing.id,
        'tx_id',    null,
        'pool_yes', v_new_pool_yes,
        'pool_no',  v_new_pool_no,
        'balance',  v_profile.balance - p_stake,
        'idempotent', true
      );
  end;

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

grant execute on function public.place_bet(text, bet_side, numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- vision_worker_runs — heartbeat / monitoring
-- ---------------------------------------------------------------------------
create table if not exists public.vision_worker_runs (
  id              bigserial primary key,
  started_at      timestamptz not null,
  finished_at     timestamptz not null default now(),
  source          text not null default 'unknown',
  cameras_total   int not null default 0 check (cameras_total >= 0),
  cameras_ok      int not null default 0 check (cameras_ok >= 0),
  cameras_failed  int not null default 0 check (cameras_failed >= 0),
  error_summary   text
);

create index if not exists vision_worker_runs_finished_at
  on public.vision_worker_runs (finished_at desc);

alter table public.vision_worker_runs enable row level security;

create policy "vision_worker_runs_deny_all"
  on public.vision_worker_runs for all to authenticated using (false);

create or replace function public.record_vision_worker_run(
  p_started_at timestamptz,
  p_source text,
  p_cameras_total int,
  p_cameras_ok int,
  p_cameras_failed int,
  p_error_summary text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id bigint;
begin
  insert into public.vision_worker_runs (
    started_at, source, cameras_total, cameras_ok, cameras_failed, error_summary
  ) values (
    p_started_at,
    coalesce(nullif(trim(p_source), ''), 'unknown'),
    greatest(0, coalesce(p_cameras_total, 0)),
    greatest(0, coalesce(p_cameras_ok, 0)),
    greatest(0, coalesce(p_cameras_failed, 0)),
    nullif(trim(coalesce(p_error_summary, '')), '')
  )
  returning id into v_id;

  delete from public.vision_worker_runs
  where id not in (
    select id from public.vision_worker_runs order by finished_at desc limit 200
  );

  return jsonb_build_object('ok', true, 'run_id', v_id);
end;
$$;

revoke all on function public.record_vision_worker_run(timestamptz, text, int, int, int, text) from public;
grant execute on function public.record_vision_worker_run(timestamptz, text, int, int, int, text) to service_role;

create or replace function public.get_vision_worker_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_last public.vision_worker_runs%rowtype;
  v_stale_minutes numeric;
  v_healthy boolean;
begin
  perform public.assert_admin();

  select * into v_last
  from public.vision_worker_runs
  order by finished_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'has_runs', false,
      'healthy', false,
      'message', 'Nenhuma execução registrada'
    );
  end if;

  v_stale_minutes := extract(epoch from (now() - v_last.finished_at)) / 60;
  v_healthy := v_last.finished_at >= now() - interval '15 minutes'
    and v_last.error_summary is null
    and (v_last.cameras_total = 0 or v_last.cameras_failed < v_last.cameras_total);

  return jsonb_build_object(
    'has_runs', true,
    'healthy', v_healthy,
    'last_run_at', v_last.finished_at,
    'minutes_since', round(v_stale_minutes::numeric, 1),
    'source', v_last.source,
    'cameras_total', v_last.cameras_total,
    'cameras_ok', v_last.cameras_ok,
    'cameras_failed', v_last.cameras_failed,
    'error_summary', v_last.error_summary
  );
end;
$$;

grant execute on function public.get_vision_worker_status() to authenticated;

-- ---------------------------------------------------------------------------
-- partner payouts — status simulado + histórico com status
-- ---------------------------------------------------------------------------
alter table public.partner_payouts
  alter column status set default 'simulated';

create or replace function public.partner_request_payout(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_min numeric;
  v_real boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  v_min := public.partner_setting_num('min_payout_amount', 50);
  if p_amount < v_min then raise exception 'Minimum payout is %', v_min; end if;

  select coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'partner_payouts_real'),
    false
  ) into v_real;

  select balance into v_bal from public.partner_accounts where user_id = v_uid and status = 'active' for update;
  if not found then raise exception 'Not active partner'; end if;
  if v_bal < p_amount then raise exception 'Insufficient balance'; end if;

  update public.partner_accounts set balance = balance - p_amount where user_id = v_uid;
  insert into public.partner_payouts (partner_id, amount, status, method)
  values (
    v_uid,
    p_amount,
    case when v_real then 'pending' else 'simulated' end,
    case when v_real then 'pix' else 'simulated' end
  );

  return jsonb_build_object(
    'ok', true,
    'balance', v_bal - p_amount,
    'simulated', not v_real
  );
end;
$$;

create or replace function public.get_partner_payouts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', id,
        'amount', amount,
        'method', method,
        'status', status,
        'at', created_at
      ) order by created_at desc
    )
    from public.partner_payouts where partner_id = v_uid limit 50
  ), '[]'::jsonb);
end;
$$;
