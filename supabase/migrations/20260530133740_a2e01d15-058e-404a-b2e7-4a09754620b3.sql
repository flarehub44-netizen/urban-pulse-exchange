-- =====================================================================
-- Production hardening — refund leak, fixture regression, advisory locks,
-- admin helper and policy swaps.
-- =====================================================================

-- 1) Refund withdrawal on PAYOUT_FAILED (recreate process_syncpay_webhook_event)
--    We patch the elsif branch in-place by replacing the function with the
--    same body plus the refund call.

create or replace function public.process_syncpay_webhook_event(
  p_event text,
  p_provider_id text,
  p_payload jsonb,
  p_signature text default null,
  p_received_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id    bigint;
  v_intent      public.payment_intents%rowtype;
  v_new_status  text;
  v_action      text;
  v_note        text;
  v_payer_doc   text;
begin
  insert into public.syncpay_webhook_events (event, provider_id, payload, signature, received_at)
  values (p_event, p_provider_id, p_payload, p_signature, p_received_at)
  on conflict (provider_id, event) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into v_intent
  from public.payment_intents
  where provider_id = p_provider_id
  limit 1;

  if v_intent.id is not null
     and exists (
       select 1 from public.syncpay_webhook_events
        where provider_id = p_provider_id
          and event = p_event
          and processing_status = 'processed'
          and id <> v_event_id
     ) then
    update public.syncpay_webhook_events
       set processing_status = 'ignored',
           processing_note = 'duplicate_event',
           processed_at = now()
     where id = v_event_id;
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'deduped');
  end if;

  if v_intent.id is null then
    update public.syncpay_webhook_events
       set processing_status = 'ignored',
           processing_note = 'unknown_provider_id',
           processed_at = now()
     where id = v_event_id;
    return jsonb_build_object('ok', true, 'ignored', true, 'reason', 'unknown_provider_id');
  end if;

  if v_intent.status <> 'pending' then
    update public.syncpay_webhook_events
       set processing_status = 'ignored',
           processing_note = 'intent_not_pending',
           processed_at = now()
     where id = v_event_id;
    return jsonb_build_object('ok', true, 'already_processed', true, 'action', 'intent_not_pending');
  end if;

  v_payer_doc := public.syncpay_extract_payer_document(p_payload);

  if p_event = 'PAYMENT_RECEIVED' and v_intent.type = 'deposit' then
    if v_payer_doc is not null then
      perform public.service_upsert_payment_identity(
        v_intent.user_id, v_payer_doc, 'syncpay_cashin'
      );
    end if;
    perform public.service_credit_balance(v_intent.user_id, v_intent.amount, v_intent.id);
    v_new_status := 'paid';
    v_action := 'credited';
  elsif p_event = 'PAYOUT_COMPLETED' and v_intent.type = 'withdraw' then
    v_new_status := 'paid';
    v_action := 'withdraw_paid';
  elsif p_event in ('PAYMENT_FAILED', 'PAYOUT_FAILED') then
    v_new_status := 'failed';
    if v_intent.type = 'withdraw' then
      -- CRITICAL FIX: refund the held balance back to user
      perform public.service_refund_withdrawal(
        v_intent.user_id, v_intent.amount, v_intent.id
      );
      v_action := 'withdraw_refunded';
    else
      v_action := 'deposit_failed';
    end if;
  elsif p_event = 'PAYMENT_EXPIRED' then
    v_new_status := 'expired';
    v_action := 'deposit_expired';
  else
    v_note := 'event_ignored';
  end if;

  if v_new_status is not null then
    update public.payment_intents
       set status = v_new_status,
           settled_at = case when v_new_status = 'paid' then now() else settled_at end,
           provider_payload = coalesce(provider_payload, '{}'::jsonb) || p_payload,
           meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object(
             'last_webhook_event', p_event,
             'payer_document_last4', case
               when v_payer_doc is not null then right(public.normalize_cpf_digits(v_payer_doc), 4)
               else null
             end
           ),
           updated_at = now()
     where id = v_intent.id;
  end if;

  update public.syncpay_webhook_events
     set processing_status = case when v_new_status is null then 'ignored' else 'processed' end,
         processing_note = coalesce(v_note, v_action),
         processed_at = now()
   where id = v_event_id;

  return jsonb_build_object(
    'ok', true,
    'action', coalesce(v_action, 'ignored'),
    'status', coalesce(v_new_status, v_intent.status),
    'intent_id', v_intent.id,
    'payer_document_captured', v_payer_doc is not null
  );
exception when others then
  if v_event_id is not null then
    update public.syncpay_webhook_events
       set processing_status = 'error',
           processing_note = sqlerrm,
           processed_at = now()
     where id = v_event_id;
  end if;
  raise;
end;
$$;

-- =====================================================================
-- 2) Fixture status regression guard — never revert terminal statuses
-- =====================================================================
CREATE OR REPLACE FUNCTION public.upsert_football_fixture(
  p_api_fixture_id bigint,
  p_api_league_id int,
  p_season int,
  p_kickoff_at timestamptz,
  p_status_short text,
  p_home_team_id int,
  p_home_team_name text,
  p_away_team_id int,
  p_away_team_name text,
  p_goals_home int,
  p_goals_away int,
  p_venue text default null,
  p_league_name text default null,
  p_league_country text default null,
  p_raw jsonb default '{}',
  p_home_logo_url text default null,
  p_away_logo_url text default null,
  p_goals_home_ht int default null,
  p_goals_away_ht int default null,
  p_elapsed int default null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.football_fixtures%rowtype;
  v_close_min int;
  v_terminal  text[] := ARRAY['FT','AET','PEN','CANC','ABD','AWD','WO'];
BEGIN
  INSERT INTO public.football_leagues (api_league_id, name, country, enabled)
  VALUES (
    p_api_league_id,
    COALESCE(p_league_name, 'League ' || p_api_league_id::text),
    COALESCE(p_league_country, ''),
    true
  )
  ON CONFLICT (api_league_id) DO UPDATE SET
    name = COALESCE(excluded.name, football_leagues.name),
    updated_at = now();

  SELECT * INTO v_existing FROM public.football_fixtures WHERE api_fixture_id = p_api_fixture_id;

  IF found AND v_existing.review_status = 'rejected' THEN
    RETURN jsonb_build_object('fixture_id', p_api_fixture_id, 'skipped', 'rejected');
  END IF;

  -- If existing status is terminal, treat upstream as stale: ignore status/score changes.
  IF found AND v_existing.status_short = ANY(v_terminal) THEN
    UPDATE public.football_fixtures
       SET venue       = COALESCE(p_venue, venue),
           raw_payload = COALESCE(p_raw, raw_payload),
           synced_at   = now()
     WHERE api_fixture_id = p_api_fixture_id;
    RETURN jsonb_build_object('fixture_id', p_api_fixture_id, 'ok', true, 'terminal_locked', true);
  END IF;

  INSERT INTO public.football_fixtures (
    api_fixture_id, api_league_id, season, kickoff_at, status_short,
    home_team_id, home_team_name, away_team_id, away_team_name,
    goals_home, goals_away, venue, raw_payload, synced_at,
    review_status, elapsed,
    home_logo_url, away_logo_url, goals_home_ht, goals_away_ht
  ) VALUES (
    p_api_fixture_id, p_api_league_id, p_season, p_kickoff_at, p_status_short,
    p_home_team_id, p_home_team_name, p_away_team_id, p_away_team_name,
    p_goals_home, p_goals_away, p_venue, COALESCE(p_raw, '{}'), now(),
    CASE WHEN found THEN v_existing.review_status ELSE 'pending_review'::public.football_review_status END,
    p_elapsed,
    p_home_logo_url, p_away_logo_url, p_goals_home_ht, p_goals_away_ht
  )
  ON CONFLICT (api_fixture_id) DO UPDATE SET
    kickoff_at    = excluded.kickoff_at,
    status_short  = excluded.status_short,
    goals_home    = COALESCE(excluded.goals_home, football_fixtures.goals_home),
    goals_away    = COALESCE(excluded.goals_away, football_fixtures.goals_away),
    goals_home_ht = COALESCE(excluded.goals_home_ht, football_fixtures.goals_home_ht),
    goals_away_ht = COALESCE(excluded.goals_away_ht, football_fixtures.goals_away_ht),
    elapsed       = COALESCE(excluded.elapsed,    football_fixtures.elapsed),
    venue         = COALESCE(excluded.venue,      football_fixtures.venue),
    home_logo_url = COALESCE(excluded.home_logo_url, football_fixtures.home_logo_url),
    away_logo_url = COALESCE(excluded.away_logo_url, football_fixtures.away_logo_url),
    raw_payload   = excluded.raw_payload,
    synced_at     = now();

  v_close_min := public.football_setting_num('football_betting_close_minutes', 5)::int;

  UPDATE public.football_markets fm
  SET
    betting_closes_at = f.kickoff_at - (v_close_min || ' minutes')::interval,
    accept_bets = CASE
      WHEN fm.status NOT IN ('live', 'closing') THEN false
      WHEN p_status_short = ANY(v_terminal) OR p_status_short = 'PST' THEN false
      WHEN now() >= f.kickoff_at - (v_close_min || ' minutes')::interval THEN false
      ELSE true
    END
  FROM public.football_fixtures f
  WHERE f.api_fixture_id = p_api_fixture_id
    AND fm.fixture_id = p_api_fixture_id;

  RETURN jsonb_build_object('fixture_id', p_api_fixture_id, 'ok', true);
END;
$$;

-- =====================================================================
-- 3) Advisory lock around tick_market_lifecycle — prevent overlap
-- =====================================================================
create or replace function public.tick_market_lifecycle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row    record;
  v_closed int := 0;
  v_resolved int := 0;
  v_closing int := 0;
  v_snaps  int := 0;
begin
  -- Acquire a transactional advisory lock; bail out if another tick is in flight.
  if not pg_try_advisory_xact_lock(hashtext('viax:tick_market_lifecycle')) then
    return jsonb_build_object('ok', true, 'skipped', 'locked');
  end if;

  v_snaps := public.ingest_oracle_snapshots();

  update public.markets
  set status = 'closing', updated_at = now()
  where status = 'live' and accept_bets = true
    and coalesce(is_traffic_slot, false) = false
    and ends_at > now()
    and ends_at <= now() + interval '30 minutes';
  get diagnostics v_closing = row_count;

  update public.markets
  set status = 'closed', accept_bets = false, updated_at = now()
  where status in ('live', 'closing') and ends_at <= now();
  get diagnostics v_closed = row_count;

  for v_row in
    select id from public.markets
    where status = 'closed'
      and coalesce(market_kind, 'platform') = 'platform'
    for update skip locked
  loop
    perform public.process_market_resolution(v_row.id);
    v_resolved := v_resolved + 1;
  end loop;

  return jsonb_build_object(
    'snapshots', v_snaps,
    'closing_promoted', v_closing,
    'closed', v_closed,
    'processed', v_resolved
  );
end;
$$;

-- =====================================================================
-- 4) Admin helper — STABLE security definer (replaces EXISTS(profiles) inline)
-- =====================================================================
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  );
$$;

revoke execute on function public.is_current_user_admin() from public;
grant  execute on function public.is_current_user_admin() to authenticated;

-- Swap hottest admin-EXISTS policies to use the helper
drop policy if exists football_fixtures_admin_read on public.football_fixtures;
create policy football_fixtures_admin_read on public.football_fixtures
  for select to authenticated
  using (public.is_current_user_admin());

drop policy if exists football_markets_admin on public.football_markets;
create policy football_markets_admin on public.football_markets
  for select to authenticated
  using (public.is_current_user_admin());

drop policy if exists football_bets_admin on public.football_bets;
create policy football_bets_admin on public.football_bets
  for select to authenticated
  using (public.is_current_user_admin());

drop policy if exists football_leagues_admin on public.football_leagues;
create policy football_leagues_admin on public.football_leagues
  for all to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

drop policy if exists lifecycle_tick_runs_admin_read on public.lifecycle_tick_runs;
create policy lifecycle_tick_runs_admin_read on public.lifecycle_tick_runs
  for select to authenticated
  using (public.is_current_user_admin());

drop policy if exists deposit_funnel_events_admin_select on public.deposit_funnel_events;
create policy deposit_funnel_events_admin_select on public.deposit_funnel_events
  for select to authenticated
  using (public.is_current_user_admin());