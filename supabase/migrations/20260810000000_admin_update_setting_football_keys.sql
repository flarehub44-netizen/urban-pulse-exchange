-- Allow football (and other admin UI) platform_settings keys via admin_update_setting.

create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_key not in (
    'house_fee_rate',
    'max_stake',
    'market_duration_hours',
    'regions_enabled',
    'regions_simulator_enabled',
    'partner_program_enabled',
    'default_revenue_share_pct',
    'sub_override_pct',
    'min_payout_amount',
    'default_cpa_amount',
    'cpa_min_deposit_threshold',
    'casino_enabled',
    'casino_impulse_max_per_hour',
    'camera_oracle_enabled',
    'football_enabled',
    'football_league_ids',
    'football_sync_days_back',
    'football_sync_days_ahead',
    'football_betting_close_minutes',
    'football_auto_approve',
    'football_regulation',
    'football_auto_resolve'
  ) then
    raise exception 'Invalid setting key: %', p_key;
  end if;

  insert into public.platform_settings (key, value, updated_by)
  values (p_key, p_value, auth.uid())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now(),
        updated_by = excluded.updated_by;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'update_setting', 'platform_settings', p_key, p_value);

  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;
