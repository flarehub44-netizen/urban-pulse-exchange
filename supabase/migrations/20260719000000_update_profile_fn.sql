-- RPC: update_profile — allows the authenticated user to update their own editable profile fields.
-- handle must remain unique; duplicate triggers a business error the app surfaces directly.
create or replace function public.update_profile(
  p_name         text default null,
  p_handle       text default null,
  p_city         text default null,
  p_neighborhood text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_handle  text;
begin
  if v_user_id is null then
    raise exception 'UNAUTHORIZED' using errcode = 'P0001';
  end if;

  -- normalise handle: trim + lowercase
  if p_handle is not null then
    v_handle := lower(trim(p_handle));
    if length(v_handle) < 3 or length(v_handle) > 30 then
      raise exception 'HANDLE_INVALID' using errcode = 'P0001';
    end if;
    if v_handle !~ '^[a-z0-9_]+$' then
      raise exception 'HANDLE_INVALID' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.profiles
       where handle = v_handle and id <> v_user_id
    ) then
      raise exception 'HANDLE_TAKEN' using errcode = 'P0001';
    end if;
  end if;

  update public.profiles
     set name         = coalesce(nullif(trim(p_name), ''),         name),
         handle       = coalesce(v_handle,                          handle),
         city         = coalesce(nullif(trim(p_city), ''),         city),
         neighborhood = coalesce(nullif(trim(p_neighborhood), ''), neighborhood)
   where id = v_user_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_profile(text, text, text, text) from public;
grant execute on function public.update_profile(text, text, text, text) to authenticated;
