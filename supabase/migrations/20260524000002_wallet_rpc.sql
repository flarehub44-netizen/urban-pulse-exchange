-- Wallet deposit/withdraw RPCs (Sprint 4)

create or replace function public.wallet_deposit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx_id uuid;
  v_balance numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_amount > 500000 then raise exception 'Amount exceeds limit'; end if;

  update public.profiles
  set balance = balance + p_amount
  where id = v_uid
  returning balance into v_balance;

  insert into public.transactions (user_id, type, amount, market_label)
  values (v_uid, 'deposit', p_amount, 'Carteira')
  returning id into v_tx_id;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance);
end;
$$;

create or replace function public.wallet_withdraw(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile profiles%rowtype;
  v_tx_id uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid;

  insert into public.transactions (user_id, type, amount, market_label)
  values (v_uid, 'withdraw', p_amount, 'Carteira')
  returning id into v_tx_id;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_profile.balance - p_amount);
end;
$$;

grant execute on function public.wallet_deposit(numeric) to authenticated;
grant execute on function public.wallet_withdraw(numeric) to authenticated;

-- Platform ledger summary (admin)
create or replace function public.get_platform_ledger_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean;
  v_total numeric;
  v_count int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select is_admin into v_admin from public.profiles where id = v_uid;
  if not coalesce(v_admin, false) then raise exception 'Admin only'; end if;

  select coalesce(sum(amount), 0), count(*)::int
  into v_total, v_count
  from public.platform_ledger;

  return jsonb_build_object(
    'total_house_revenue', v_total,
    'entry_count', v_count
  );
end;
$$;

grant execute on function public.get_platform_ledger_summary() to authenticated;
