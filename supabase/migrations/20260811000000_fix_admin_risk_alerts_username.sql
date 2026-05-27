-- Fix admin RPCs referencing profiles.username (column does not exist; use handle).

create or replace function public.get_admin_risk_alerts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_alerts jsonb := '[]'::jsonb;
begin
  perform public.assert_admin();
  select v_alerts || coalesce(jsonb_agg(jsonb_build_object(
    'type', 'volume_spike',
    'user_id', user_id,
    'username', (select handle from public.profiles where id = user_id),
    'detail', 'Volume > 5000 nas últimas 24h',
    'severity', 'medium'
  )), '[]'::jsonb) into v_alerts
  from (
    select user_id, sum(stake) as vol
    from public.bets where created_at >= now() - interval '24 hours'
    group by user_id having sum(stake) > 5000
  ) q;
  return v_alerts;
end;
$$;

create or replace function public.get_admin_users_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.volume desc nulls last), '[]'::jsonb) into v_result
  from (
    select p.id, p.handle as username, p.balance, p.is_admin,
           coalesce(urp.kyc_status, 'none') as kyc_status,
           coalesce(urp.risk_score, 0) as risk_score,
           coalesce(urp.frozen, false) as frozen,
           coalesce(urp.bet_limit, null) as bet_limit,
           coalesce((select sum(stake) from public.bets b where b.user_id = p.id), 0) as volume,
           exists (
             select 1 from public.partner_accounts pa
             where pa.user_id = p.id and pa.status = 'active'
           ) as is_partner
    from public.profiles p
    left join public.user_risk_profiles urp on urp.user_id = p.id
    order by volume desc
    limit 200
  ) x;
  return v_result;
end;
$$;
