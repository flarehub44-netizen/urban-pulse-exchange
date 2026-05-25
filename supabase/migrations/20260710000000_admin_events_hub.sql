-- Admin events hub: platform events, daily polls, partner events feed

-- ---------------------------------------------------------------------------
-- Overview
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_events_hub_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  perform public.assert_admin();

  return jsonb_build_object(
    'platform_events', jsonb_build_object(
      'active', (
        select count(*)::int from public.platform_events
        where v_now between starts_at and ends_at
      ),
      'upcoming', (
        select count(*)::int from public.platform_events where starts_at > v_now
      ),
      'ended', (
        select count(*)::int from public.platform_events where ends_at < v_now
      )
    ),
    'daily_polls', jsonb_build_object(
      'has_today', exists (
        select 1 from public.daily_polls where poll_date = current_date
      ),
      'total', (select count(*)::int from public.daily_polls)
    ),
    'partner_events', jsonb_build_object(
      'last_24h', (
        select count(*)::int from public.partner_events
        where created_at >= v_now - interval '24 hours'
      )
    ),
    'markets', jsonb_build_object(
      'live', (
        select count(*)::int from public.markets
        where status in ('live', 'closing', 'closed') and coalesce(frozen, false) = false
      ),
      'dispute', (
        select count(*)::int from public.markets where status = 'dispute'
      ),
      'draft', (
        select count(*)::int from public.markets where status = 'draft'
      )
    ),
    'football', jsonb_build_object(
      'pending_fixtures', (
        select count(*)::int from public.football_fixtures
        where review_status = 'pending_review'
      )
    ),
    'community', jsonb_build_object(
      'pending_reports', (
        select count(*)::int from public.market_reports where status = 'pending'
      )
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Platform events
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_platform_events()
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
      'id', e.id,
      'name', e.name,
      'slug', e.slug,
      'description', e.description,
      'starts_at', e.starts_at,
      'ends_at', e.ends_at,
      'badge_icon', e.badge_icon,
      'xp_boost', e.xp_boost,
      'created_at', e.created_at
    ) order by e.starts_at desc)
    from public.platform_events e
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_platform_event(
  p_id uuid,
  p_name text,
  p_slug text,
  p_description text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_badge_icon text default '🎉',
  p_xp_boost int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_slug text;
begin
  perform public.assert_admin();

  if p_name is null or length(trim(p_name)) < 2 then
    raise exception 'Invalid event name';
  end if;
  if p_starts_at is null or p_ends_at is null or p_starts_at >= p_ends_at then
    raise exception 'Invalid event dates';
  end if;

  v_slug := lower(trim(regexp_replace(coalesce(nullif(trim(p_slug), ''), p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  v_slug := trim(both '-' from v_slug);
  if length(v_slug) < 2 then raise exception 'Invalid slug'; end if;

  if p_id is null then
    insert into public.platform_events (
      name, slug, description, starts_at, ends_at, badge_icon, xp_boost
    )
    values (
      trim(p_name), v_slug, coalesce(p_description, ''), p_starts_at, p_ends_at,
      coalesce(nullif(trim(p_badge_icon), ''), '🎉'), coalesce(p_xp_boost, 0)
    )
    returning id into v_id;
  else
    update public.platform_events
    set
      name = trim(p_name),
      slug = v_slug,
      description = coalesce(p_description, ''),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      badge_icon = coalesce(nullif(trim(p_badge_icon), ''), '🎉'),
      xp_boost = coalesce(p_xp_boost, 0)
    where id = p_id
    returning id into v_id;
    if not found then raise exception 'Event not found'; end if;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(), 'upsert_platform_event', 'platform_events', v_id::text,
    jsonb_build_object('name', trim(p_name), 'slug', v_slug)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_delete_platform_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  delete from public.platform_events where id = p_id;
  if not found then raise exception 'Event not found'; end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'delete_platform_event', 'platform_events', p_id::text, '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily polls
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_daily_polls(p_limit int default 30)
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
      'id', p.id,
      'question', p.question,
      'poll_date', p.poll_date,
      'yes_count', p.yes_count,
      'no_count', p.no_count,
      'created_at', p.created_at
    ) order by p.poll_date desc)
    from (
      select * from public.daily_polls
      order by poll_date desc
      limit greatest(1, least(coalesce(p_limit, 30), 100))
    ) p
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_upsert_daily_poll(
  p_id uuid,
  p_question text,
  p_poll_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.assert_admin();

  if p_question is null or length(trim(p_question)) < 5 then
    raise exception 'Invalid poll question';
  end if;
  if p_poll_date is null then raise exception 'Invalid poll date'; end if;

  if p_id is null then
    insert into public.daily_polls (question, poll_date)
    values (trim(p_question), p_poll_date)
    on conflict (poll_date) do update set question = excluded.question
    returning id into v_id;
  else
    update public.daily_polls
    set question = trim(p_question), poll_date = p_poll_date
    where id = p_id
    returning id into v_id;
    if not found then raise exception 'Poll not found'; end if;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(), 'upsert_daily_poll', 'daily_polls', v_id::text,
    jsonb_build_object('poll_date', p_poll_date)
  );

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_delete_daily_poll(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  delete from public.daily_polls where id = p_id;
  if not found then raise exception 'Poll not found'; end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'delete_daily_poll', 'daily_polls', p_id::text, '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Partner events (moderation)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_partner_events(
  p_limit int default 50,
  p_partner_id uuid default null,
  p_partner_query text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid := p_partner_id;
begin
  perform public.assert_admin();

  if v_partner_id is null and p_partner_query is not null and length(trim(p_partner_query)) > 0 then
    if trim(p_partner_query) ~* '^[0-9a-f-]{36}$' then
      v_partner_id := trim(p_partner_query)::uuid;
    else
      select pr.id into v_partner_id
      from public.profiles pr
      where lower(pr.handle) = lower(trim(p_partner_query))
      limit 1;
    end if;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', e.id,
      'partner_id', e.partner_id,
      'partner_handle', pr.handle,
      'partner_slug', pa.slug,
      'kind', e.kind,
      'message', e.message,
      'meta', e.meta,
      'created_at', e.created_at
    ) order by e.created_at desc)
    from (
      select pe.*
      from public.partner_events pe
      where v_partner_id is null or pe.partner_id = v_partner_id
      order by pe.created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) e
    join public.partner_accounts pa on pa.user_id = e.partner_id
    join public.profiles pr on pr.id = e.partner_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_delete_partner_event(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  delete from public.partner_events where id = p_id;
  if not found then raise exception 'Partner event not found'; end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'delete_partner_event', 'partner_events', p_id::text, '{}'::jsonb);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.admin_get_events_hub_overview() to authenticated;
grant execute on function public.admin_list_platform_events() to authenticated;
grant execute on function public.admin_upsert_platform_event(uuid, text, text, text, timestamptz, timestamptz, text, int) to authenticated;
grant execute on function public.admin_delete_platform_event(uuid) to authenticated;
grant execute on function public.admin_list_daily_polls(int) to authenticated;
grant execute on function public.admin_upsert_daily_poll(uuid, text, date) to authenticated;
grant execute on function public.admin_delete_daily_poll(uuid) to authenticated;
grant execute on function public.admin_list_partner_events(int, uuid, text) to authenticated;
grant execute on function public.admin_delete_partner_event(bigint) to authenticated;
