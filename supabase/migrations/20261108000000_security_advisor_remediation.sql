-- Security Advisor remediation (P0–P2): RPC execute surface, search_path, partitions, storage.

-- ---------------------------------------------------------------------------
-- P0: Remove anon/public EXECUTE from all SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as func
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prosecdef
      and (
        has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('public', p.oid, 'EXECUTE')
      )
  loop
    execute format('revoke execute on function %s from public, anon', r.func);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- P0/P1: Server-only RPCs (service_role only)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as func, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        p.proname like '\_%' escape '\'
        or p.proname like 'cron\_%' escape '\'
        or p.proname in (
          'notify_league_rank_changes',
          'refresh_league_member_stats',
          'settle_outcome_market',
          'prevent_profile_privileged_updates',
          'allocate_partner_commissions',
          'assert_admin_mfa',
          'enqueue_event_impact_xp',
          'guard_payment_intents_delete'
        )
        or p.proname like 'admin\_%' escape '\'
        or p.proname like 'get_admin\_%' escape '\'
        or p.proname = 'get_platform_settings_admin'
      )
  loop
    execute format('revoke execute on function %s from authenticated', r.func);
    execute format('grant execute on function %s to service_role', r.func);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- P1: Fix mutable search_path on league helpers
-- ---------------------------------------------------------------------------
alter function public._league_clamp_roi(numeric) set search_path = public;
alter function public._league_compute_score(numeric, numeric, numeric, numeric) set search_path = public;
alter function public._league_verticals_allow_all(text[]) set search_path = public;
alter function public._league_vertical_allowed(text[], text) set search_path = public;

-- ---------------------------------------------------------------------------
-- P3: Extend authenticated allowlist (leagues P1/P2, outcome/crypto bets)
-- ---------------------------------------------------------------------------
do $$
declare
  v_allowed text[] := array[
    'place_bet', 'place_football_bet', 'place_outcome_bet', 'place_crypto_slot_bet',
    'request_withdrawal',
    'get_my_account_context', 'update_profile_cpf', 'update_profile', 'is_user_registered',
    'create_community_market', 'join_community_market', 'get_community_market',
    'list_public_community_markets', 'list_my_community_markets',
    'resolve_community_market', 'report_community_market', 'void_community_market',
    'create_market', 'search_markets', 'get_market_recent_bets', 'get_market_social_proof',
    'get_market_audit', 'record_market_view',
    'bind_referral_attribution', 'track_partner_click',
    'apply_partner_program', 'create_partner_campaign', 'partner_request_payout',
    'get_partner_overview', 'get_partner_revenue_series', 'get_partner_events_feed',
    'get_partner_invites_list', 'get_partner_campaigns', 'get_partner_leaderboard',
    'get_partner_analytics', 'get_partner_sub_affiliates', 'get_partner_payouts',
    'get_my_partner_status', 'resolve_partner_slug', 'get_public_expert_profile',
    'get_public_trader_bets', 'get_public_active_bets',
    'get_following_active_bets', 'get_following_trader_ids', 'toggle_trader_follow',
    'get_my_leagues', 'create_league', 'join_league', 'join_league_by_id', 'leave_league',
    'delete_league', 'get_league_leaderboard', 'get_my_league_rank', 'list_public_leagues',
    'get_league_activity', 'kick_league_member', 'transfer_league_ownership',
    'get_league_season_history', 'get_league_weekly_missions', 'claim_league_weekly_bonus',
    'get_league_head_to_head', 'get_league_suggested_rival', 'advance_league_season',
    'like_feed_post', 'comment_feed_post', 'repost_feed_post',
    'daily_check_in', 'grant_email_link_bonus', 'use_streak_freeze',
    'record_comeback_if_needed', 'buy_streak_freeze',
    'get_daily_missions', 'complete_mission', 'get_weekly_pulse_report',
    'get_trader_archetype', 'get_user_achievements',
    'user_has_deposited', 'maybe_send_deposit_nudge', 'track_deposit_funnel_event',
    'is_football_enabled',
    'get_traffic_public_state', 'list_traffic_ended_markets', 'list_live_cameras',
    'get_recent_near_miss', 'get_today_poll', 'vote_daily_poll', 'get_active_events',
    'get_urbanmind_digest', 'get_camera_health', 'get_vision_worker_status',
    'get_region_camera_status',
    'try_sync_admin_allowlist', 'claim_admin_invite', 'claim_sub_partner_invite',
    'complete_registration', 'casino_daily_spin', 'casino_spin_status', 'set_casino_opt_out',
    'get_monthly_impact_leaderboard', 'get_my_event_impact_summary',
    'count_payer_linked_accounts', 'monthly_withdrawn_brl_for_cpf_hash',
    'payer_cluster_referring_partners', 'resolve_user_payer_cpf_hash'
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

-- ---------------------------------------------------------------------------
-- P2: camera_metrics partitions — deny_all policy (INFO lint)
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'camera\_metrics%' escape '\'
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = r.relname
        and policyname = 'camera_metrics_deny_all'
    ) then
      execute format(
        'create policy camera_metrics_deny_all on public.%I for all to authenticated using (false) with check (false)',
        r.relname
      );
    end if;
  end loop;
end
$$;

-- Future partitions: apply deny_all when created
create or replace function public.ensure_monthly_partition(
  p_parent regclass,
  p_month  date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_name text := split_part(p_parent::text, '.', 2);
  v_parent_only text := coalesce(nullif(v_parent_name, ''), p_parent::text);
  v_start date := date_trunc('month', p_month)::date;
  v_end   date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_child text := format('%s_y%sm%s', v_parent_only, to_char(v_start,'YYYY'), to_char(v_start,'MM'));
  v_is_camera boolean := v_parent_only like 'camera\_metrics%' escape '\';
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_child
  ) then
    execute format(
      'create table public.%I partition of %s for values from (%L) to (%L)',
      v_child, p_parent::text, v_start, v_end
    );
    if v_is_camera then
      execute format('alter table public.%I enable row level security', v_child);
      execute format(
        'create policy camera_metrics_deny_all on public.%I for all to authenticated using (false) with check (false)',
        v_child
      );
    end if;
  end if;
end;
$$;
revoke execute on function public.ensure_monthly_partition(regclass, date) from public, anon, authenticated;
grant execute on function public.ensure_monthly_partition(regclass, date) to service_role;

-- ---------------------------------------------------------------------------
-- P2: community-covers — remove broad listing policy (public URLs still work)
-- ---------------------------------------------------------------------------
drop policy if exists community_covers_select on storage.objects;
