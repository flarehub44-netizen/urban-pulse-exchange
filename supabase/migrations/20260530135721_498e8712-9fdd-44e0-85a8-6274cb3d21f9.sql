-- 1) profiles_block_privileged_updates
create or replace function public.profiles_block_privileged_updates()
returns trigger language plpgsql security definer set search_path = public as $$
declare caller uuid := auth.uid(); is_caller_admin boolean := false;
begin
  if caller is null then return new; end if;
  select is_admin into is_caller_admin from public.profiles where id = caller;
  if coalesce(is_caller_admin, false) then return new; end if;
  if new.is_admin is distinct from old.is_admin
    or new.balance is distinct from old.balance
    or new.kyc_status is distinct from old.kyc_status
    or new.cpf is distinct from old.cpf
    or new.phone is distinct from old.phone
    or new.banned_at is distinct from old.banned_at
    or new.ban_reason is distinct from old.ban_reason
    or new.pnl is distinct from old.pnl or new.roi is distinct from old.roi
    or new.xp is distinct from old.xp or new.xp_to_next is distinct from old.xp_to_next
    or new.division is distinct from old.division or new.accuracy is distinct from old.accuracy
    or new.streak is distinct from old.streak
    or new.streak_freezes_left is distinct from old.streak_freezes_left
    or new.streak_multiplier is distinct from old.streak_multiplier
    or new.volume_24h is distinct from old.volume_24h
    or new.recovery_mode is distinct from old.recovery_mode
    or new.recovery_days_left is distinct from old.recovery_days_left
    or new.email_bonus_claimed is distinct from old.email_bonus_claimed
    or new.is_ai is distinct from old.is_ai
  then raise exception 'Cannot modify privileged profile fields'; end if;
  return new;
end; $$;

-- 2) oracle_snapshots
drop policy if exists oracle_snapshots_read_authenticated on public.oracle_snapshots;
drop policy if exists oracle_snapshots_admin_read on public.oracle_snapshots;
drop policy if exists oracle_snapshots_read_resolved on public.oracle_snapshots;
create policy oracle_snapshots_admin_read on public.oracle_snapshots
  for select to authenticated using (public.is_current_user_admin());
create policy oracle_snapshots_read_resolved on public.oracle_snapshots
  for select to authenticated
  using (exists(select 1 from public.markets m
                where m.id = oracle_snapshots.market_id
                  and m.status = 'resolved'::market_status));

-- 3) football_market_resolutions: column-level grant (esconde inputs, payout_summary)
revoke select on public.football_market_resolutions from anon, authenticated;
grant select (id, market_id, status, winning_outcome, goals_home, goals_away, source, created_at)
  on public.football_market_resolutions to anon, authenticated;
grant select on public.football_market_resolutions to service_role;

-- 4) football_fixtures: esconde raw_payload + review_*
revoke select on public.football_fixtures from anon, authenticated;
grant select (
  api_fixture_id, api_league_id, season,
  home_team_id, home_team_name, home_logo_url,
  away_team_id, away_team_name, away_logo_url,
  kickoff_at, venue, status_short, elapsed,
  goals_home, goals_away, goals_home_ht, goals_away_ht,
  synced_at, created_at, review_status
) on public.football_fixtures to anon, authenticated;
grant select on public.football_fixtures to service_role;

-- 5) monthly_impact_winners: esconde fulfilled_*, notes
revoke select on public.monthly_impact_winners from anon, authenticated;
grant select (id, period_month, rank, user_id, xp_total, prize_label, created_at)
  on public.monthly_impact_winners to anon, authenticated;
grant select on public.monthly_impact_winners to service_role;

-- 7) REVOKE EXECUTE em SECURITY DEFINER mal expostas
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'admin_get_cpf_velocity_report','admin_list_monthly_impact_winners',
      'admin_list_payer_document_clusters','admin_mark_impact_prize_fulfilled',
      'admin_payer_document_cluster','_compute_event_impact_xp',
      '_impact_creator_xp_today','_impact_creator_xp_week')
  loop execute format('revoke execute on function %s from public, anon', r.sig); end loop;

  for r in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'process_syncpay_webhook_event','service_assert_velocity_limit',
      'service_credit_pending_event_impact_xp','service_finalize_monthly_impact',
      'service_fraud_cluster_sweep','service_record_payer_document_event',
      'service_record_velocity_event')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

-- 8) profile_public → security_invoker
do $$ begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
             where n.nspname='public' and c.relname='profile_public' and c.relkind='v') then
    execute 'alter view public.profile_public set (security_invoker = true)';
  end if;
end $$;

-- 9) _impact_period_month: search_path fixo
create or replace function public._impact_period_month(p_ts timestamptz default now())
returns date language sql stable set search_path = public as $$
  select date_trunc('month', timezone('America/Sao_Paulo', coalesce(p_ts, now())))::date;
$$;