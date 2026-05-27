-- Admin: delete traffic template from eternal catalog.

create or replace function public.admin_delete_traffic_template(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  delete from public.traffic_event_templates
  where id = p_template_id;

  if not found then
    raise exception 'Template not found';
  end if;

  return jsonb_build_object('ok', true, 'deleted_id', p_template_id);
end;
$$;

grant execute on function public.admin_delete_traffic_template(uuid) to authenticated;
