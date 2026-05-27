-- Admin: gestão de bônus e cash distribuído a usuários comuns

-- ---------------------------------------------------------------------------
-- Helper: usuário comum (não admin, não partner ativo)
-- ---------------------------------------------------------------------------
create or replace function public._is_common_user(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and not coalesce(p.is_admin, false)
      and not exists (
        select 1
        from public.partner_accounts pa
        where pa.user_id = p.id and pa.status = 'active'
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- get_admin_bonus_overview — totais no período (usuários comuns)
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_bonus_overview(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_days int := greatest(1, least(coalesce(p_days, 30), 365));
  v_since timestamptz := now() - (v_days || ' days')::interval;
  v_bonus_cash numeric := 0;
  v_spin_cash numeric := 0;
  v_spin_xp bigint := 0;
  v_spin_count bigint := 0;
  v_impulse_cash numeric := 0;
  v_impulse_count bigint := 0;
  v_admin_cash numeric := 0;
  v_admin_xp bigint := 0;
  v_recipients bigint := 0;
  v_email_xp_claims bigint := 0;
begin
  perform public.assert_admin();

  select coalesce(sum(t.amount), 0)
  into v_bonus_cash
  from public.transactions t
  where t.type = 'bonus'
    and t.created_at >= v_since
    and public._is_common_user(t.user_id);

  select
    coalesce(sum(s.reward_amount), 0),
    coalesce(sum(s.reward_xp), 0),
    count(*)
  into v_spin_cash, v_spin_xp, v_spin_count
  from public.user_spins s
  where s.created_at >= v_since
    and public._is_common_user(s.user_id);

  select coalesce(sum(d.amount), 0), count(*)
  into v_impulse_cash, v_impulse_count
  from public.deposit_impulse_log d
  where d.created_at >= v_since
    and public._is_common_user(d.user_id);

  select
    coalesce(sum((a.payload->>'amount')::numeric) filter (where a.payload->>'kind' = 'balance'), 0),
    coalesce(sum((a.payload->>'amount')::bigint) filter (where a.payload->>'kind' = 'xp'), 0)
  into v_admin_cash, v_admin_xp
  from public.admin_actions a
  where a.action = 'grant_user_bonus'
    and a.created_at >= v_since;

  select count(distinct uid)
  into v_recipients
  from (
    select t.user_id as uid
    from public.transactions t
    where t.type = 'bonus' and t.created_at >= v_since and public._is_common_user(t.user_id)
    union
    select s.user_id from public.user_spins s
    where s.created_at >= v_since and public._is_common_user(s.user_id)
    union
    select d.user_id from public.deposit_impulse_log d
    where d.created_at >= v_since and public._is_common_user(d.user_id)
    union
    select (a.target_id)::uuid from public.admin_actions a
    where a.action = 'grant_user_bonus' and a.created_at >= v_since
  ) u;

  select count(*)
  into v_email_xp_claims
  from public.profiles p
  where p.email_bonus_claimed
    and public._is_common_user(p.id);

  return jsonb_build_object(
    'period_days', v_days,
    'bonus_cash_total', v_bonus_cash,
    'spin_cash_total', v_spin_cash,
    'spin_xp_total', v_spin_xp,
    'spin_count', v_spin_count,
    'impulse_cash_total', v_impulse_cash,
    'impulse_count', v_impulse_count,
    'admin_grants_cash', v_admin_cash,
    'admin_grants_xp', v_admin_xp,
    'unique_recipients', v_recipients,
    'email_xp_claims_all_time', v_email_xp_claims,
    'email_xp_total_all_time', v_email_xp_claims * 500
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_bonus_ledger — histórico recente de distribuições
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_bonus_ledger(p_limit int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();

  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select *
    from (
      select
        t.id::text as id,
        t.user_id,
        p.username,
        'bonus_tx'::text as kind,
        null::text as source,
        t.amount as cash_amount,
        0::bigint as xp_amount,
        coalesce(t.market_label, 'Bônus') as label,
        t.created_at
      from public.transactions t
      join public.profiles p on p.id = t.user_id
      where t.type = 'bonus'
        and public._is_common_user(t.user_id)

      union all

      select
        s.id::text,
        s.user_id,
        p.username,
        'casino_spin',
        s.source::text,
        s.reward_amount,
        s.reward_xp::bigint,
        coalesce(s.outcome_key, 'roleta'),
        s.created_at
      from public.user_spins s
      join public.profiles p on p.id = s.user_id
      where public._is_common_user(s.user_id)

      union all

      select
        d.id::text,
        d.user_id,
        p.username,
        'impulse_deposit',
        coalesce(d.context, 'impulse'),
        d.amount,
        0::bigint,
        'Depósito impulsivo',
        d.created_at
      from public.deposit_impulse_log d
      join public.profiles p on p.id = d.user_id
      where public._is_common_user(d.user_id)

      union all

      select
        a.id::text,
        a.target_id::uuid,
        p.username,
        'admin_grant',
        a.payload->>'kind',
        case when a.payload->>'kind' = 'balance'
          then (a.payload->>'amount')::numeric else 0 end,
        case when a.payload->>'kind' = 'xp'
          then (a.payload->>'amount')::bigint else 0 end,
        coalesce(a.payload->>'reason', 'Concessão admin'),
        a.created_at
      from public.admin_actions a
      join public.profiles p on p.id = a.target_id::uuid
      where a.action = 'grant_user_bonus'
        and public._is_common_user(a.target_id::uuid)
    ) combined
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 300))
  ) x;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_grant_user_bonus — conceder saldo ou XP a usuário comum
-- ---------------------------------------------------------------------------
create or replace function public.admin_grant_user_bonus(
  p_user_id uuid,
  p_amount numeric,
  p_kind text default 'balance',
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
  v_tx_id uuid;
  v_progress jsonb;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  perform public.assert_admin();

  if p_user_id is null then
    raise exception 'User required';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_kind not in ('balance', 'xp') then
    raise exception 'Invalid kind';
  end if;
  if not public._is_common_user(p_user_id) then
    raise exception 'Target must be a common user (not admin or active partner)';
  end if;

  if p_kind = 'balance' then
    if p_amount > 500000 then
      raise exception 'Amount exceeds limit';
    end if;

    update public.profiles
    set balance = balance + p_amount
    where id = p_user_id
    returning balance into v_balance_after;

    if not found then
      raise exception 'User not found';
    end if;

    insert into public.transactions (
      user_id, type, amount, market_label,
      before_balance, after_balance
    )
    values (
      p_user_id,
      'bonus',
      p_amount,
      coalesce(v_reason, 'Bônus admin'),
      v_balance_after - p_amount,
      v_balance_after
    )
    returning id into v_tx_id;
  else
    if p_amount > 100000 then
      raise exception 'XP amount exceeds limit';
    end if;

    v_progress := public.apply_user_progress(
      p_user_id,
      'admin_grant',
      p_amount::int
    );
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'grant_user_bonus',
    'profile',
    p_user_id::text,
    jsonb_build_object(
      'kind', p_kind,
      'amount', p_amount,
      'reason', v_reason,
      'tx_id', v_tx_id
    )
  );

  return jsonb_build_object(
    'ok', true,
    'kind', p_kind,
    'amount', p_amount,
    'balance', v_balance_after,
    'progress', v_progress
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_update_casino_spin_weights — validação + auditoria
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_casino_spin_weights(p_weights jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_total numeric := 0;
begin
  perform public.assert_admin();

  if p_weights is null or jsonb_typeof(p_weights) <> 'array' or jsonb_array_length(p_weights) = 0 then
    raise exception 'Weights must be a non-empty array';
  end if;

  for v_item in select elem from jsonb_array_elements(p_weights) elem loop
    if v_item->>'key' is null or (v_item->>'weight') is null then
      raise exception 'Each weight entry needs key and weight';
    end if;
    if (v_item->>'weight')::numeric <= 0 then
      raise exception 'Weight must be positive';
    end if;
    v_total := v_total + (v_item->>'weight')::numeric;
  end loop;

  if v_total <= 0 then
    raise exception 'Total weight must be positive';
  end if;

  insert into public.platform_settings (key, value)
  values ('casino_spin_weights', p_weights)
  on conflict (key) do update set value = excluded.value, updated_at = now();

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'update_spin_weights',
    'platform_setting',
    'casino_spin_weights',
    jsonb_build_object('entries', jsonb_array_length(p_weights), 'total_weight', v_total)
  );

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_admin_bonus_overview(int) to authenticated;
grant execute on function public.get_admin_bonus_ledger(int) to authenticated;
grant execute on function public.admin_grant_user_bonus(uuid, numeric, text, text) to authenticated;
grant execute on function public.admin_update_casino_spin_weights(jsonb) to authenticated;
