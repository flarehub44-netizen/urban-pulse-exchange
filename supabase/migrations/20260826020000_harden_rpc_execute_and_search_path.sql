-- P0/P1 hardening: RPC execute surface, mutable search_path, and extension schema.

-- 1) Fix mutable search_path warnings.
alter function public.normalize_cpf_digits(text) set search_path = public;
alter function public.is_valid_cpf(text) set search_path = public;
alter function public.hash_cpf_document(text) set search_path = public;
alter function public.syncpay_extract_payer_document(jsonb) set search_path = public;
alter function public.partner_cpa_withdrawable_at(timestamptz) set search_path = public;

-- 2) Attempt to move pg_net out of public.
-- Some hosted Supabase setups do not allow moving this extension (0A000).
create schema if not exists extensions;
do $$
begin
  begin
    execute 'alter extension pg_net set schema extensions';
  exception
    when feature_not_supported then
      raise notice 'Skipping pg_net schema move: feature not supported on this project';
    when undefined_object then
      raise notice 'Skipping pg_net schema move: extension pg_net is not installed';
  end;
end
$$;

-- 3) Default deny for SECURITY DEFINER functions exposed in public.
do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as func_name,
           pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    execute format(
      'revoke execute on function %I.%I(%s) from public, anon, authenticated',
      r.schema_name, r.func_name, r.identity_args
    );
    execute format(
      'grant execute on function %I.%I(%s) to service_role',
      r.schema_name, r.func_name, r.identity_args
    );
  end loop;
end
$$;

-- 4) Explicit allowlist for authenticated end-user RPCs.
do $$
declare
  v_allowed text[] := array[
    'place_bet','place_football_bet','request_withdrawal',
    'get_my_account_context','update_profile_cpf','update_profile','is_user_registered',
    'create_community_market','join_community_market','get_community_market',
    'list_public_community_markets','list_my_community_markets',
    'resolve_community_market','report_community_market','void_community_market',
    'create_market','search_markets','get_market_recent_bets','get_market_social_proof',
    'get_market_audit','record_market_view',
    'bind_referral_attribution','track_partner_click',
    'apply_partner_program','create_partner_campaign','partner_request_payout',
    'get_partner_overview','get_partner_revenue_series','get_partner_events_feed',
    'get_partner_invites_list','get_partner_campaigns','get_partner_leaderboard',
    'get_partner_analytics','get_partner_sub_affiliates','get_partner_payouts',
    'get_my_partner_status','resolve_partner_slug','get_public_expert_profile',
    'get_public_trader_bets','get_public_active_bets',
    'get_following_active_bets','get_following_trader_ids','toggle_trader_follow',
    'get_my_leagues','create_league','join_league','leave_league','get_league_leaderboard',
    'like_feed_post','comment_feed_post','repost_feed_post',
    'daily_check_in','grant_email_link_bonus','use_streak_freeze',
    'record_comeback_if_needed','buy_streak_freeze',
    'get_daily_missions','complete_mission','get_weekly_pulse_report',
    'get_trader_archetype','get_user_achievements','check_user_achievements',
    'apply_user_progress','user_has_deposited','maybe_send_deposit_nudge',
    'track_deposit_funnel_event',
    'is_football_enabled','upsert_football_fixture','resolve_football_fixture',
    'get_traffic_public_state','list_traffic_ended_markets','list_live_cameras',
    'get_recent_near_miss','get_today_poll','vote_daily_poll','get_active_events',
    'get_urbanmind_digest','get_camera_health','get_vision_worker_status',
    'get_region_camera_status','get_camera_region_raw','get_camera_upstream',
    'try_sync_admin_allowlist','claim_admin_invite','claim_sub_partner_invite',
    'is_current_user_admin','is_admin','assert_user_account_active'
  ];
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as func_name,
           pg_get_function_identity_arguments(p.oid) as identity_args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.proname = any(v_allowed)
  loop
    execute format(
      'grant execute on function %I.%I(%s) to authenticated',
      r.schema_name, r.func_name, r.identity_args
    );
  end loop;
end
$$;
