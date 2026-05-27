-- Sub-creators only for partners explicitly enabled by admin.

alter table public.partner_accounts
  add column if not exists sub_creators_enabled boolean not null default false;

comment on column public.partner_accounts.sub_creators_enabled is
  'When true, partner may invite and manage sub-creators (2-level network).';

-- ---------------------------------------------------------------------------
-- Admin: approve with optional sub-creators flag
-- ---------------------------------------------------------------------------
drop function if exists public.admin_approve_partner(uuid, text, text, numeric, numeric);

create or replace function public.admin_approve_partner(
  p_user_id uuid,
  p_tier text default 'Bronze',
  p_slug text default null,
  p_revenue_share_pct numeric default null,
  p_cpa_amount numeric default null,
  p_sub_creators_enabled boolean default false
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
    user_id, slug, status, tier, revenue_share_pct, cpa_amount, verified, sub_creators_enabled
  )
  values (
    p_user_id, v_slug, 'active', coalesce(p_tier, 'Bronze'), v_share, v_cpa, true,
    coalesce(p_sub_creators_enabled, false)
  )
  on conflict (user_id) do update set
    status = 'active',
    tier = excluded.tier,
    revenue_share_pct = excluded.revenue_share_pct,
    cpa_amount = excluded.cpa_amount,
    verified = true,
    sub_creators_enabled = excluded.sub_creators_enabled,
    updated_at = now();

  update public.partner_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = p_user_id and status = 'pending';

  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

grant execute on function public.admin_approve_partner(uuid, text, text, numeric, numeric, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin: toggle sub-creators for active partner
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_partner_sub_creators(
  p_user_id uuid,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  update public.partner_accounts
  set sub_creators_enabled = coalesce(p_enabled, false), updated_at = now()
  where user_id = p_user_id and status = 'active';

  if not found then raise exception 'Partner not found or not active'; end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(), 'set_partner_sub_creators', 'partner_accounts', p_user_id::text,
    jsonb_build_object('enabled', coalesce(p_enabled, false))
  );

  return jsonb_build_object('ok', true, 'sub_creators_enabled', coalesce(p_enabled, false));
end;
$$;

grant execute on function public.admin_set_partner_sub_creators(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin list includes flag
-- ---------------------------------------------------------------------------
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
      'sub_creators_enabled', pa.sub_creators_enabled,
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

-- ---------------------------------------------------------------------------
-- Partner overview exposes flag
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
  v_is_admin boolean;
  v_handle text;
  v_referrals int;
  v_volume numeric;
  v_revenue numeric;
  v_clicks int;
  v_conversions int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_pa from public.partner_accounts where user_id = v_uid and status = 'active';

  if not found then
    select coalesce(p.is_admin, false), coalesce(p.handle, '')
    into v_is_admin, v_handle
    from public.profiles p
    where p.id = v_uid;

    if v_is_admin then
      return jsonb_build_object(
        'balance', 0,
        'tier', 'Admin (preview)',
        'slug', v_handle,
        'referrals', 0,
        'volume', 0,
        'revenue', 0,
        'clicks', 0,
        'conversions', 0,
        'conversion_rate', 0,
        'revenue_share_pct', public.partner_setting_num('default_revenue_share_pct', 0.20),
        'cpa_amount', public.partner_setting_num('default_cpa_amount', 0),
        'cpa_uses_custom', false,
        'cpa_min_deposit_threshold', public.partner_setting_num('cpa_min_deposit_threshold', 50),
        'sub_creators_enabled', false,
        'admin_preview', true
      );
    end if;

    raise exception 'Not an active partner';
  end if;

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
    'cpa_min_deposit_threshold', public.partner_setting_num('cpa_min_deposit_threshold', 50),
    'sub_creators_enabled', coalesce(v_pa.sub_creators_enabled, false),
    'admin_preview', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Gate sub-creator RPCs
-- ---------------------------------------------------------------------------
create or replace function public.get_partner_sub_affiliates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  if not exists (
    select 1 from public.partner_accounts
    where user_id = v_uid and status = 'active' and sub_creators_enabled = true
  ) then
    raise exception 'Sub-creators not enabled for this partner';
  end if;

  select sub_invite_code into v_code from public.partner_accounts where user_id = v_uid;
  if v_code is null then
    v_code := upper(substr(md5(v_uid::text || now()::text), 1, 8));
    update public.partner_accounts set sub_invite_code = v_code where user_id = v_uid;
  end if;

  return jsonb_build_object(
    'invite_code', v_code,
    'subs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', pa.user_id, 'slug', pa.slug, 'tier', pa.tier, 'balance', pa.balance
      ))
      from public.partner_accounts pa where pa.parent_partner_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.claim_sub_partner_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_master uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select user_id into v_master from public.partner_accounts
  where sub_invite_code = upper(trim(p_code))
    and status = 'active'
    and sub_creators_enabled = true;

  if not found then return jsonb_build_object('ok', false); end if;
  if v_master = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;

  insert into public.partner_accounts (user_id, slug, status, parent_partner_id, revenue_share_pct)
  select v_uid, lower(p.handle), 'pending', v_master, public.partner_setting_num('default_revenue_share_pct', 0.20)
  from public.profiles p where p.id = v_uid
  on conflict (user_id) do update set parent_partner_id = excluded.parent_partner_id
  where partner_accounts.status = 'pending';

  return jsonb_build_object('ok', true, 'master_id', v_master);
end;
$$;
