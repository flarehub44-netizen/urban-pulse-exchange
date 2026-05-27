-- Admin moderation: todos os eventos de usuários comuns (incl. privados/unlisted)

-- ---------------------------------------------------------------------------
-- assert_community_market_access — admins podem ver qualquer mercado
-- ---------------------------------------------------------------------------
create or replace function public.assert_community_market_access(
  p_market public.markets,
  p_user_id uuid,
  p_access_token text default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_market.market_kind is distinct from 'community' then
    return true;
  end if;
  if p_user_id is not null and exists (
    select 1 from public.profiles p
    where p.id = p_user_id and coalesce(p.is_admin, false)
  ) then
    return true;
  end if;
  if p_market.visibility = 'public' then
    return true;
  end if;
  if p_user_id is not null and p_market.created_by = p_user_id then
    return true;
  end if;
  if p_user_id is not null and exists (
    select 1 from public.market_access ma
    where ma.market_id = p_market.id and ma.user_id = p_user_id
  ) then
    return true;
  end if;
  if p_access_token is not null
    and p_market.access_token is not null
    and p_market.access_token = p_access_token then
    return true;
  end if;
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_community_markets_list — só criadores usuário comum, incl. privados
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
        (select count(*)::int from public.bets b where b.market_id = m.id) as bets_count,
        (select count(*)::int from public.market_reports r
         where r.market_id = m.id and r.status = 'pending') as pending_reports,
        case when m.visibility = 'unlisted' then m.access_token else null end as access_token
      from public.markets m
      join public.profiles p on p.id = m.created_by
      where m.market_kind = 'community'
        and public._is_common_user(m.created_by)
      order by m.created_at desc
      limit 500
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_admin_community_reports — denúncias de mercados de usuários comuns
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
        m.visibility,
        p.username as reporter_username
      from public.market_reports r
      join public.markets m on m.id = r.market_id
      join public.profiles p on p.id = r.reporter_id
      where r.status = 'pending'
        and m.market_kind = 'community'
        and public._is_common_user(m.created_by)
      order by r.created_at desc
      limit greatest(1, least(p_limit, 100))
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_void_community_market — reembolso + auditoria
-- ---------------------------------------------------------------------------
create or replace function public.admin_void_community_market(
  p_market_id text,
  p_reason text default 'admin_moderation'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.markets%rowtype;
  v_result jsonb;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'admin_moderation');
begin
  perform public.assert_admin();

  select * into v_market from public.markets where id = p_market_id;
  if not found then raise exception 'Market not found'; end if;
  if v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;
  if not public._is_common_user(v_market.created_by) then
    raise exception 'not_common_user_market';
  end if;

  v_result := public.refund_market(p_market_id, v_reason);

  update public.market_reports
  set status = 'reviewed'
  where market_id = p_market_id and status = 'pending';

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'void_community_market',
    'market',
    p_market_id,
    jsonb_build_object(
      'reason', v_reason,
      'creator_id', v_market.created_by,
      'visibility', v_market.visibility,
      'refunds', v_result->'refunds'
    )
  );

  return v_result;
end;
$$;

grant execute on function public.admin_void_community_market(text, text) to authenticated;
