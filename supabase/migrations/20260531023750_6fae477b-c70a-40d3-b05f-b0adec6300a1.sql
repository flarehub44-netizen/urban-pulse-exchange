CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric, p_pix_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid               uuid    := auth.uid();
  v_profile           public.profiles%rowtype;
  v_intent            uuid;
  v_pix_key           text    := nullif(trim(coalesce(p_pix_key, '')), '');
  v_pix_digits        text;
  v_profile_cpf       text;
  v_min_amount        numeric := 7;
  v_max_amount        numeric := 5000;
  v_monthly_withdrawn numeric;
  v_kyc_month_limit   numeric := 100;
  v_rl                jsonb;
begin
  if v_uid is null then
    raise exception 'Não autorizado';
  end if;

  perform public.assert_user_account_active(v_uid);

  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;

  select public.service_assert_rate_limit(
    'withdraw_rpc:' || v_uid::text,
    5,
    86400
  ) into v_rl;
  if coalesce((v_rl->>'limited')::boolean, false) then
    raise exception 'rate_limit_exceeded: máximo de 5 saques por dia atingido. Tente novamente amanhã.';
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

  select coalesce(sum(pi.amount), 0)
    into v_monthly_withdrawn
  from public.payment_intents pi
  where pi.user_id = v_uid
    and pi.type = 'withdraw'
    and pi.status = 'paid'
    and pi.settled_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo');

  if v_profile.kyc_status <> 'approved'
     and (v_monthly_withdrawn + p_amount) > v_kyc_month_limit then
    raise exception
      'kyc_required_cumulative: limite mensal de R$ % para contas não verificadas atingido. Já sacado este mês: R$ %. Complete a verificação de identidade para continuar.',
      v_kyc_month_limit,
      v_monthly_withdrawn;
  end if;

  if v_profile.balance < p_amount then
    raise exception 'Saldo insuficiente';
  end if;

  v_pix_digits  := regexp_replace(v_pix_key, '\D', '', 'g');
  v_profile_cpf := public.normalize_cpf_digits(v_profile.cpf);
  if length(v_pix_digits) = 11
     and v_profile_cpf is not null
     and length(v_profile_cpf) = 11
     and v_pix_digits <> v_profile_cpf then
    raise exception 'Chave Pix CPF deve ser o mesmo CPF cadastrado no perfil';
  end if;

  perform set_config('viax.progression', 'on', true);

  update public.profiles
  set balance = balance - p_amount
  where id = v_uid;

  perform set_config('viax.progression', 'off', true);

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
    'balance',   v_profile.balance - p_amount
  );
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$function$;

CREATE OR REPLACE FUNCTION public.service_refund_withdrawal(p_user_id uuid, p_amount numeric, p_intent_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_balance_after numeric;
begin
  perform set_config('viax.progression', 'on', true);

  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  perform set_config('viax.progression', 'off', true);

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'refund', p_amount, 'Estorno de Saque',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'refund',
    'Saque de ' || p_amount::text || ' BRL não pôde ser processado. Saldo estornado.'
  );
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$function$;