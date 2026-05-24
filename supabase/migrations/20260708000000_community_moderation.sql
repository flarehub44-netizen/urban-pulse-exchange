-- Community moderation: reports, admin list, join rate limit

create table if not exists public.market_reports (
  id          uuid primary key default gen_random_uuid(),
  market_id   text not null references public.markets(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (length(trim(reason)) >= 5),
  status      text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index if not exists market_reports_pending_idx
  on public.market_reports(status, created_at desc)
  where status = 'pending';

alter table public.market_reports enable row level security;

create policy "market_reports_insert_own"
  on public.market_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy "market_reports_select_own"
  on public.market_reports for select
  to authenticated
  using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- report_community_market
-- ---------------------------------------------------------------------------
create or replace function public.report_community_market(
  p_market_id text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then
    raise exception 'reason_too_short';
  end if;

  select * into v_market from public.markets where id = p_market_id;
  if not found or v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;

  if exists (
    select 1 from public.market_reports
    where market_id = p_market_id and reporter_id = v_uid and status = 'pending'
  ) then
    return jsonb_build_object('ok', true, 'already_reported', true);
  end if;

  insert into public.market_reports (market_id, reporter_id, reason)
  values (p_market_id, v_uid, trim(p_reason));

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_community_markets_list
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_community_markets_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select
        m.id,
        m.question,
        m.visibility,
        m.status,
        m.ends_at,
        m.created_at,
        m.pool_yes + m.pool_no as volume,
        p.username as creator_username,
        m.created_by,
        (select count(*)::int from public.market_reports r
         where r.market_id = m.id and r.status = 'pending') as pending_reports
      from public.markets m
      left join public.profiles p on p.id = m.created_by
      where m.market_kind = 'community'
      order by m.created_at desc
      limit 200
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_community_reports
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_community_reports(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select
        r.id,
        r.market_id,
        r.reason,
        r.created_at,
        m.question,
        p.username as reporter_username
      from public.market_reports r
      join public.markets m on m.id = r.market_id
      join public.profiles p on p.id = r.reporter_id
      where r.status = 'pending'
      order by r.created_at desc
      limit greatest(1, least(p_limit, 100))
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- join_community_market — rate limit (max 20 joins / hour per user)
-- ---------------------------------------------------------------------------
create or replace function public.join_community_market(p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
  v_recent int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not public.is_user_registered(v_uid) then
    raise exception 'registration_required';
  end if;
  if p_access_token is null or length(trim(p_access_token)) < 8 then
    raise exception 'invalid_token';
  end if;

  select count(*) into v_recent
  from public.market_access
  where user_id = v_uid and joined_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'join_rate_limit';
  end if;

  select * into v_market
  from public.markets
  where access_token = trim(p_access_token)
    and market_kind = 'community'
    and visibility = 'unlisted';

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_token');
  end if;

  insert into public.market_access (market_id, user_id)
  values (v_market.id, v_uid)
  on conflict do nothing;

  return jsonb_build_object(
    'ok', true,
    'market_id', v_market.id,
    'question', v_market.question
  );
end;
$$;

grant execute on function public.report_community_market(text, text) to authenticated;
grant execute on function public.get_admin_community_markets_list() to authenticated;
grant execute on function public.get_admin_community_reports(int) to authenticated;
