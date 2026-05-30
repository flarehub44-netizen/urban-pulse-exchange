
-- H6: prevent self-referral CPA payout
CREATE OR REPLACE FUNCTION public.maybe_pay_partner_cpa(p_user_id uuid, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ur public.user_referrals%rowtype;
  v_partner public.partner_accounts%rowtype;
  v_threshold numeric;
  v_cpa numeric;
  v_was_first boolean;
  v_release_at timestamptz;
begin
  if not public.is_partner_program_enabled() then return; end if;
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select * into v_ur from public.user_referrals where user_id = p_user_id for update;
  if not found or v_ur.cpa_paid_at is not null then return; end if;

  -- H6 FIX: block self-referral (partner_id must differ from referred user)
  if v_ur.partner_id = p_user_id then
    update public.user_referrals set cpa_paid_at = now()
    where user_id = p_user_id and cpa_paid_at is null;
    begin
      perform public.record_user_risk_alert(
        p_user_id, 'self_referral_blocked',
        'Auto-indicação detectada: CPA bloqueado.',
        jsonb_build_object('partner_id', v_ur.partner_id, 'amount', p_amount)
      );
    exception when others then null;
    end;
    return;
  end if;

  v_was_first := v_ur.first_deposit_at is null;

  update public.user_referrals
  set qualified_deposit_total = qualified_deposit_total + p_amount,
      first_deposit_at = coalesce(first_deposit_at, now())
  where user_id = p_user_id
  returning * into v_ur;

  if v_was_first then
    perform public.emit_partner_event(
      v_ur.partner_id, 'deposit',
      'Indicado depositou R$ ' || p_amount::text,
      jsonb_build_object('user_id', p_user_id, 'amount', p_amount)
    );
  end if;

  v_threshold := public.partner_setting_num('cpa_min_deposit_threshold', 50);
  if v_ur.qualified_deposit_total < v_threshold then return; end if;

  select * into v_partner from public.partner_accounts
  where user_id = v_ur.partner_id and status = 'active' for update;

  v_cpa := coalesce(
    case when found then v_partner.cpa_amount end,
    public.partner_setting_num('default_cpa_amount', 0)
  );

  v_release_at := public.partner_cpa_withdrawable_at(now());

  if found and v_cpa > 0 then
    insert into public.partner_commission_ledger (
      partner_id, amount, rake_base, referred_volume, kind, meta, withdrawable_at
    )
    values (
      v_ur.partner_id, v_cpa, 0, v_ur.qualified_deposit_total, 'cpa',
      jsonb_build_object(
        'referred_user_id', p_user_id,
        'deposit_total', v_ur.qualified_deposit_total,
        'accrual', 'pending_until_day_8'
      ),
      v_release_at
    );

    update public.partner_accounts
    set pending_balance = pending_balance + v_cpa, updated_at = now()
    where user_id = v_ur.partner_id;

    perform public.emit_partner_event(
      v_ur.partner_id, 'cpa',
      'CPA de R$ ' || v_cpa::text || ' provisionado — liberável em ' || to_char(v_release_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
      jsonb_build_object('user_id', p_user_id, 'amount', v_cpa, 'deposit_total', v_ur.qualified_deposit_total, 'withdrawable_at', v_release_at)
    );
  end if;

  update public.user_referrals set cpa_paid_at = now()
  where user_id = p_user_id and cpa_paid_at is null;

  perform public.evaluate_cpa_fraud_heuristics(p_user_id);
end;
$function$;

-- H7: 24h dispute window before creator can resolve a community market
CREATE OR REPLACE FUNCTION public.resolve_community_market(p_market_id text, p_winning_side bet_side)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;
  if v_market.created_by is distinct from v_uid then
    raise exception 'creator_only';
  end if;
  if v_market.ends_at > now() then
    raise exception 'market_still_open';
  end if;
  -- H7 FIX: 24h dispute window
  if v_market.ends_at > now() - interval '24 hours' then
    raise exception 'dispute_window_active: aguarde 24h após o fim do mercado para resolver';
  end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'already_terminal';
  end if;

  if v_market.status in ('live', 'closing') then
    update public.markets
    set status = 'closed', accept_bets = false, updated_at = now()
    where id = p_market_id;
  end if;

  return public.settle_market(p_market_id, p_winning_side);
end;
$function$;

-- H10: update_profile_cpf must check account is active
CREATE OR REPLACE FUNCTION public.update_profile_cpf(p_cpf text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_digits text := public.normalize_cpf_digits(p_cpf);
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  -- H10 FIX
  perform public.assert_user_account_active(v_user_id);

  if v_digits is null or not public.is_valid_cpf(v_digits) then
    raise exception 'CPF_INVALID' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.profiles p
    where regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g') = v_digits
      and p.id <> v_user_id
  ) then
    raise exception 'CPF_ALREADY_USED' using errcode = 'P0001';
  end if;

  update public.profiles set cpf = v_digits where id = v_user_id;

  return jsonb_build_object('ok', true, 'cpf_last4', right(v_digits, 4));
end;
$function$;
