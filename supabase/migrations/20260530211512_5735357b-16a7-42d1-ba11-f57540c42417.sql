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
  v_cpf_hash          text;
  v_min_amount        numeric := 10;
  v_max_amount        numeric := 10;
  v_monthly_withdrawn numeric;
  v_kyc_month_limit   numeric := 100;
  v_rl                jsonb;
  v_account_age_h     numeric;
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

  v_cpf_hash := public.hash_cpf_document(v_profile.cpf);
  if v_cpf_hash is null then
    raise exception
      'cpf_required_for_withdrawal: cadastre um CPF válido no perfil antes de sacar.';
  end if;

  v_monthly_withdrawn := public.monthly_withdrawn_brl_for_cpf_hash(v_cpf_hash);

  -- KYC gate temporariamente desativado
  -- if v_profile.kyc_status <> 'approved'
  --    and (v_monthly_withdrawn + p_amount) > v_kyc_month_limit then
  --   raise exception
  --     'kyc_required_cumulative: limite mensal de R$ % por CPF para contas não verificadas atingido. Já sacado este mês (todas as contas vinculadas): R$ %. Complete a verificação de identidade para continuar.',
  --     v_kyc_month_limit,
  --     v_monthly_withdrawn;
  -- end if;

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

  update public.profiles
  set balance = balance - p_amount
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

  begin
    v_account_age_h := extract(epoch from (now() - v_profile.created_at)) / 3600.0;
    if v_account_age_h < 48 then
      perform public.record_user_risk_alert(
        v_uid,
        'new_account_withdrawal',
        'Conta com menos de 48h solicitou saque. Verificar possível fraude.',
        jsonb_build_object(
          'account_age_hours', round(v_account_age_h::numeric, 1),
          'withdrawal_amount', p_amount,
          'intent_id',         v_intent::text,
          'kyc_status',        v_profile.kyc_status,
          'cpf_masked',        public.mask_cpf(v_profile.cpf)
        )
      );
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'intent_id', v_intent,
    'balance',   v_profile.balance - p_amount
  );
end;
$function$;