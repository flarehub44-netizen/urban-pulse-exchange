-- Partner CPA + admin terms (global defaults and per-partner overrides)

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.partner_accounts
  add column if not exists cpa_amount numeric(14,2)
    check (cpa_amount is null or cpa_amount >= 0);

alter table public.user_referrals
  add column if not exists qualified_deposit_total numeric(14,2) not null default 0,
  add column if not exists cpa_paid_at timestamptz;

insert into public.platform_settings (key, value) values
  ('default_cpa_amount', '25'::jsonb),
  ('cpa_min_deposit_threshold', '50'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- CPA payout on qualified deposits
-- ---------------------------------------------------------------------------
create or replace function public.maybe_pay_partner_cpa(
  p_user_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ur public.user_referrals%rowtype;
  v_partner public.partner_accounts%rowtype;
  v_threshold numeric;
  v_cpa numeric;
  v_was_first boolean;
begin
  if not public.is_partner_program_enabled() then return; end if;
  if p_user_id is null or p_amount is null or p_amount <= 0 then return; end if;

  select * into v_ur
  from public.user_referrals
  where user_id = p_user_id
  for update;

  if not found or v_ur.cpa_paid_at is not null then return; end if;

  v_was_first := v_ur.first_deposit_at is null;

  update public.user_referrals
  set
    qualified_deposit_total = qualified_deposit_total + p_amount,
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

  select * into v_partner
  from public.partner_accounts
  where user_id = v_ur.partner_id and status = 'active'
  for update;

  v_cpa := coalesce(
    case when found then v_partner.cpa_amount end,
    public.partner_setting_num('default_cpa_amount', 0)
  );

  if found and v_cpa > 0 then
    insert into public.partner_commission_ledger (
      partner_id, amount, rake_base, referred_volume, kind, meta
    )
    values (
      v_ur.partner_id, v_cpa, 0, v_ur.qualified_deposit_total, 'cpa',
      jsonb_build_object(
        'referred_user_id', p_user_id,
        'deposit_total', v_ur.qualified_deposit_total
      )
    );

    update public.partner_accounts
    set balance = balance + v_cpa, updated_at = now()
    where user_id = v_ur.partner_id;

    perform public.emit_partner_event(
      v_ur.partner_id, 'cpa',
      'CPA de R$ ' || v_cpa::text || ' — indicado qualificou com depósito',
      jsonb_build_object(
        'user_id', p_user_id,
        'amount', v_cpa,
        'deposit_total', v_ur.qualified_deposit_total
      )
    );
  end if;

  update public.user_referrals
  set cpa_paid_at = now()
  where user_id = p_user_id and cpa_paid_at is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hook deposit paths
-- ---------------------------------------------------------------------------
create or replace function public.service_credit_balance(
  p_user_id  uuid,
  p_amount   numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'deposit', p_amount, 'Depósito Pix',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'alert',
    'Depósito de ' || p_amount::text || ' BRL confirmado!'
  );

  perform public.maybe_pay_partner_cpa(p_user_id, p_amount);
end;
$$;

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
    v_balance_after - p_amount,
    v_balance_after
  )
  returning id into v_tx_id;

  perform public.maybe_pay_partner_cpa(v_uid, p_amount);

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance_after);
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs
-- ---------------------------------------------------------------------------
drop function if exists public.admin_approve_partner(uuid, text, text);

create or replace function public.admin_approve_partner(
  p_user_id uuid,
  p_tier text default 'Bronze',
  p_slug text default null,
  p_revenue_share_pct numeric default null,
  p_cpa_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_share numeric;
  v_cpa numeric;
begin
  perform public.assert_admin();

  if p_revenue_share_pct is not null
     and (p_revenue_share_pct <= 0 or p_revenue_share_pct > 1) then
    raise exception 'Invalid revenue share';
  end if;
  if p_cpa_amount is not null and p_cpa_amount < 0 then
    raise exception 'Invalid CPA amount';
  end if;

  select handle into v_slug from public.profiles where id = p_user_id;
  v_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g')));
  v_share := coalesce(
    p_revenue_share_pct,
    public.partner_setting_num('default_revenue_share_pct', 0.20)
  );
  v_cpa := p_cpa_amount;

  insert into public.partner_accounts (
    user_id, slug, status, tier, revenue_share_pct, cpa_amount, verified
  )
  values (
    p_user_id, v_slug, 'active', coalesce(p_tier, 'Bronze'), v_share, v_cpa, true
  )
  on conflict (user_id) do update set
    status = 'active',
    tier = excluded.tier,
    revenue_share_pct = excluded.revenue_share_pct,
    cpa_amount = excluded.cpa_amount,
    verified = true,
    updated_at = now();

  update public.partner_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = p_user_id and status = 'pending';

  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.admin_list_active_partners()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', pa.user_id,
      'handle', p.handle,
      'name', p.name,
      'slug', pa.slug,
      'tier', pa.tier,
      'revenue_share_pct', pa.revenue_share_pct,
      'cpa_amount', pa.cpa_amount,
      'balance', pa.balance,
      'referrals_count', (
        select count(*)::int from public.user_referrals ur where ur.partner_id = pa.user_id
      )
    ) order by pa.created_at desc)
    from public.partner_accounts pa
    join public.profiles p on p.id = pa.user_id
    where pa.status = 'active'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_update_partner_terms(
  p_user_id uuid,
  p_revenue_share_pct numeric,
  p_cpa_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  if p_revenue_share_pct is null or p_revenue_share_pct <= 0 or p_revenue_share_pct > 1 then
    raise exception 'Invalid revenue share';
  end if;
  if p_cpa_amount is not null and p_cpa_amount < 0 then
    raise exception 'Invalid CPA amount';
  end if;

  update public.partner_accounts
  set
    revenue_share_pct = p_revenue_share_pct,
    cpa_amount = p_cpa_amount,
    updated_at = now()
  where user_id = p_user_id and status = 'active';

  if not found then raise exception 'Partner not found or not active'; end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(), 'update_partner_terms', 'partner_accounts', p_user_id::text,
    jsonb_build_object(
      'revenue_share_pct', p_revenue_share_pct,
      'cpa_amount', p_cpa_amount
    )
  );

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_key not in (
    'house_fee_rate', 'max_stake', 'market_duration_hours', 'regions_enabled',
    'partner_program_enabled', 'default_revenue_share_pct', 'sub_override_pct',
    'min_payout_amount', 'default_cpa_amount', 'cpa_min_deposit_threshold'
  ) then
    raise exception 'Invalid setting key';
  end if;
  insert into public.platform_settings (key, value, updated_by)
  values (p_key, p_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'update_setting', 'platform_settings', p_key, p_value);
  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner overview readout
-- ---------------------------------------------------------------------------
create or replace function public.get_partner_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pa public.partner_accounts%rowtype;
  v_referrals int;
  v_volume numeric;
  v_revenue numeric;
  v_clicks int;
  v_conversions int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select * into v_pa from public.partner_accounts where user_id = v_uid and status = 'active';
  if not found then raise exception 'Not an active partner'; end if;

  select count(*) into v_referrals from public.user_referrals where partner_id = v_uid;
  select coalesce(sum(b.stake), 0) into v_volume
  from public.bets b
  join public.user_referrals ur on ur.user_id = b.user_id
  where ur.partner_id = v_uid;
  select coalesce(sum(amount), 0) into v_revenue
  from public.partner_commission_ledger where partner_id = v_uid;
  select coalesce(sum(clicks), 0), coalesce(sum(conversions), 0)
  into v_clicks, v_conversions
  from public.partner_campaigns where partner_id = v_uid;

  return jsonb_build_object(
    'balance', v_pa.balance,
    'tier', v_pa.tier,
    'slug', v_pa.slug,
    'referrals', v_referrals,
    'volume', v_volume,
    'revenue', v_revenue,
    'clicks', v_clicks,
    'conversions', v_conversions,
    'conversion_rate', case when v_clicks > 0 then round((v_conversions::numeric / v_clicks) * 100, 1) else 0 end,
    'revenue_share_pct', v_pa.revenue_share_pct,
    'cpa_amount', coalesce(v_pa.cpa_amount, public.partner_setting_num('default_cpa_amount', 0)),
    'cpa_uses_custom', v_pa.cpa_amount is not null,
    'cpa_min_deposit_threshold', public.partner_setting_num('cpa_min_deposit_threshold', 50)
  );
end;
$$;

grant execute on function public.admin_list_active_partners() to authenticated;
grant execute on function public.admin_update_partner_terms(uuid, numeric, numeric) to authenticated;
grant execute on function public.admin_approve_partner(uuid, text, text, numeric, numeric) to authenticated;
