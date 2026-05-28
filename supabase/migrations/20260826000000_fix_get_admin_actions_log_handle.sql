-- Fix get_admin_actions_log: profiles has handle, not username (PostgreSQL 42703).

create or replace function public.get_admin_actions_log(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  perform public.assert_admin();
  select coalesce(jsonb_agg(row_to_json(x) order by x.created_at desc), '[]'::jsonb)
  into v_result
  from (
    select a.id, a.action, a.target_type, a.target_id, a.payload, a.created_at,
           p.handle as admin_username
    from public.admin_actions a
    left join public.profiles p on p.id = a.admin_id
    order by a.created_at desc
    limit greatest(1, least(p_limit, 200))
  ) x;
  return v_result;
end;
$$;

grant execute on function public.get_admin_actions_log(int) to authenticated;
