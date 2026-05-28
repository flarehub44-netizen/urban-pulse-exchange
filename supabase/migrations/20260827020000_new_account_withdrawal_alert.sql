-- Semana 3: New-account withdrawal alert + cross-account velocity admin RPC
--
-- Scenario guarded: a bot farm registers N accounts, deposits, and immediately
-- withdraws R$99 each. The alert fires synchronously inside request_withdrawal
-- for any account that is < 48 hours old — the alert never blocks a legitimate
-- withdrawal (exceptions are swallowed).
--
-- Also adds:
--   admin_get_cpf_velocity_report()  — finds duplicate CPFs and new-account
--                                      withdrawal patterns for admin review.
--   F11 fix: get_urbanmind_digest feature gate defaults to OFF when the
--            platform_settings row is missing (was: defaults to ON).

-- ---------------------------------------------------------------------------
-- Update request_withdrawal: add new-account alert (semana 3)
-- ---------------------------------------------------------------------------
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
  v_uid               uuid    := auth.uid();
  v_profile           public.profiles%rowtype;
  v_intent            uuid;
  v_pix_key           text    := nullif(trim(coalesce(p_pix_key, '')), '');
  v_pix_digits        text;
  v_profile_cpf       text;
  v_min_amount        numeric := 10;
  v_max_amount        numeric := 5000;
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

  -- F09: velocity gate — max 5 withdrawal attempts per user per 24h
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

  -- V07: cumulative monthly KYC gate
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
      'kyc_required_cumulative: limite mensal de R$ % para contas não verificadas atingido. '
      'Já sacado este mês: R$ %. Complete a verificação de identidade para continuar.',
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

  -- Semana 3: flag new accounts (< 48h old) requesting withdrawal.
  -- Never blocks the operation — exceptions are intentionally swallowed.
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
$$;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- admin_get_cpf_velocity_report: cross-account fraud detection for admin
--
-- Returns:
--   cpf_duplicates  — CPFs linked to more than one account (requires only
--                     unique index to exist; this catches registration races
--                     before the index was in place or enforcement gaps).
--   new_account_withdrawals — accounts < 7 days old that already have a
--                     withdrawal intent, ordered by most recent first.
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_cpf_velocity_report(
  p_new_account_days integer default 7
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duplicates jsonb;
  v_new_withdrawals jsonb;
begin
  perform public.assert_admin();

  -- CPFs that appear on more than one account (unique index violation survivors)
  select coalesce(jsonb_agg(row_to_json(t) order by t.account_count desc), '[]'::jsonb)
    into v_duplicates
  from (
    select
      public.mask_cpf(p.cpf) as cpf_masked,
      count(*)                as account_count,
      jsonb_agg(jsonb_build_object(
        'user_id',    p.id,
        'created_at', p.created_at,
        'kyc_status', p.kyc_status,
        'balance',    p.balance,
        'banned',     (p.banned_at is not null)
      ) order by p.created_at) as accounts
    from public.profiles p
    where p.cpf is not null
    group by p.cpf
    having count(*) > 1
    limit 50
  ) t;

  -- Accounts created within the last N days that already requested a withdrawal
  select coalesce(jsonb_agg(row_to_json(t) order by t.intent_created_at desc), '[]'::jsonb)
    into v_new_withdrawals
  from (
    select
      p.id                              as user_id,
      p.created_at                      as account_created_at,
      extract(epoch from (now() - p.created_at)) / 3600.0  as account_age_hours,
      p.kyc_status,
      public.mask_cpf(p.cpf)            as cpf_masked,
      pi.id                             as intent_id,
      pi.amount                         as withdrawal_amount,
      pi.status                         as intent_status,
      pi.created_at                     as intent_created_at
    from public.profiles p
    join public.payment_intents pi
      on pi.user_id = p.id
     and pi.type    = 'withdraw'
    where p.created_at >= now() - (p_new_account_days || ' days')::interval
    order by pi.created_at desc
    limit 200
  ) t;

  return jsonb_build_object(
    'cpf_duplicates',        v_duplicates,
    'new_account_withdrawals', v_new_withdrawals,
    'params', jsonb_build_object('new_account_days', p_new_account_days)
  );
end;
$$;

revoke execute on function public.admin_get_cpf_velocity_report(integer) from public;
grant execute on function public.admin_get_cpf_velocity_report(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- F11: get_urbanmind_digest feature gate — default to OFF when row is missing
-- ---------------------------------------------------------------------------
create or replace function public.get_urbanmind_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_profile     profiles%rowtype;
  v_mem         user_ai_memory%rowtype;
  v_archetype   jsonb;
  v_market      markets%rowtype;
  v_rate        numeric;
  v_line        text;
  v_name        text;
  v_enabled     boolean;
  v_rl          jsonb;
begin
  if v_user_id is null then return '{}'::jsonb; end if;

  -- F11: server-side feature gate — default to false when row is absent
  select coalesce((value)::boolean, false)
    into v_enabled
  from public.platform_settings
  where key = 'urbanmind_enabled';

  if coalesce(v_enabled, false) = false then
    raise exception 'feature_disabled: urbanmind';
  end if;

  -- Per-user rate limit — max 30 calls/hour to control AI costs
  select public.service_assert_rate_limit(
    'urbanmind:' || v_user_id::text,
    30,
    3600
  ) into v_rl;
  if coalesce((v_rl->>'limited')::boolean, false) then
    raise exception 'rate_limit_exceeded: urbanmind digest';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_mem from public.user_ai_memory where user_id = v_user_id;

  v_name := split_part(v_profile.name, ' ', 1);

  if v_mem.bets_vs_ai > 0 then
    v_rate := round((v_mem.wins_vs_ai::numeric / v_mem.bets_vs_ai) * 100, 0);
  end if;

  if v_mem.last_market_id is not null then
    select * into v_market from public.markets where id = v_mem.last_market_id;
  end if;

  v_line := case
    when v_mem.best_accuracy_region is not null and v_rate >= 60 then
      v_name || ', sua acurácia em ' || v_mem.best_accuracy_region || ' é excepcional. Tem mercado aberto lá agora.'
    when v_mem.worst_accuracy_region is not null and v_mem.total_bets > 10 then
      'Dica: ' || v_name || ' evite mercados em ' || v_mem.worst_accuracy_region || ' por enquanto — acurácia baixa lá. Foque em ' || coalesce(v_mem.best_accuracy_region, 'sua região forte') || '.'
    when v_rate >= 50 then
      'Quando você discorda da UrbanMind, acerta ' || v_rate::text || '% das vezes. Use isso no próximo mercado.'
    when v_mem.favorite_category is not null then
      'Sua categoria mais forte é ' || v_mem.favorite_category || '. A IA sugere olhar mercados desta categoria hoje.'
    when v_mem.total_bets > 0 then
      v_name || ', você já fez ' || v_mem.total_bets::text || ' palpites. Hoje a IA recomenda mercados de ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city) || '.'
    else
      'Comece com um mercado ao vivo na sua região — a UrbanMind mostra onde a cidade e você divergem.'
  end;

  return jsonb_build_object(
    'headline',              'Pulso UrbanMind · ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city),
    'body',                  v_line,
    'wins_vs_ai',            coalesce(v_mem.wins_vs_ai, 0),
    'bets_vs_ai',            coalesce(v_mem.bets_vs_ai, 0),
    'last_market_id',        v_mem.last_market_id,
    'last_side',             v_mem.last_side,
    'favorite_region',       v_mem.favorite_region,
    'best_accuracy_region',  v_mem.best_accuracy_region,
    'worst_accuracy_region', v_mem.worst_accuracy_region,
    'favorite_category',     v_mem.favorite_category,
    'avg_stake',             v_mem.avg_stake
  );
end;
$$;
