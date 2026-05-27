-- Depósito e saque Pix: valor mínimo R$ 10.

create or replace function public.request_withdrawal(
  p_amount  numeric,
  p_pix_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_profile     public.profiles%rowtype;
  v_intent      uuid;
  v_pix_key     text := nullif(trim(coalesce(p_pix_key, '')), '');
  v_pix_digits  text;
  v_profile_cpf text;
  v_min_amount  numeric := 10;
  v_max_amount  numeric := 5000;
begin
  if v_uid is null then
    raise exception 'Não autorizado';
  end if;

  perform public.assert_user_account_active(v_uid);

  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um valor positivo';
  end if;

  if p_amount < v_min_amount then
    raise exception 'Valor mínimo de saque é R$ %', v_min_amount;
  end if;

  if p_amount > v_max_amount then
    raise exception 'Valor máximo de saque é R$ %', v_max_amount;
  end if;

  if v_pix_key is null then
    raise exception 'Chave Pix é obrigatória';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'Perfil não encontrado';
  end if;

  if p_amount > 100 and v_profile.kyc_status <> 'approved' then
    raise exception 'kyc_required: complete identity verification to withdraw above 100 BRL';
  end if;

  if v_profile.balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  v_pix_digits := regexp_replace(v_pix_key, '\D', '', 'g');
  v_profile_cpf := public.normalize_cpf_digits(v_profile.cpf);
  if length(v_pix_digits) = 11
     and v_profile_cpf is not null
     and length(v_profile_cpf) = 11
     and v_pix_digits <> v_profile_cpf then
    raise exception 'Chave Pix CPF deve ser o mesmo CPF cadastrado no perfil';
  end if;

  update public.profiles
  set balance = balance - p_amount,
      pix_key = v_pix_key
  where id = v_uid;

  insert into public.payment_intents (user_id, type, amount, pix_key, status)
  values (v_uid, 'withdraw', p_amount, v_pix_key, 'pending')
  returning id into v_intent;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Saque Pix',
    v_profile.balance,
    v_profile.balance - p_amount
  );

  return jsonb_build_object(
    'intent_id', v_intent,
    'balance', v_profile.balance - p_amount
  );
end;
$$;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;
