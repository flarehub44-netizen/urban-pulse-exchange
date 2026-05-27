-- Allow admins without an active partner_accounts row to preview Creator Hub (zeros + flag).

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
    'admin_preview', false
  );
end;
$$;

grant execute on function public.get_partner_overview() to authenticated;
