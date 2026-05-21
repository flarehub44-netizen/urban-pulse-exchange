-- Admin bootstrap: allowlist + one-time invite codes (real auth users, not seed UUIDs)

-- Clear demo-only admin flags (bypass guard trigger for this maintenance block)
alter table public.profiles disable trigger profiles_guard_sensitive;
update public.profiles
set is_admin = false
where id::text like '10000000-%' or id = '00000000-0000-0000-0000-000000000001';
alter table public.profiles enable trigger profiles_guard_sensitive;

create table if not exists public.admin_allowlist (
  email text primary key,
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.admin_invites (
  code text primary key,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  note text default '',
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;
alter table public.admin_invites enable row level security;

-- No direct client access
create policy "admin_allowlist_deny_all"
  on public.admin_allowlist for all to authenticated using (false);
create policy "admin_invites_deny_all"
  on public.admin_invites for all to authenticated using (false);

-- Single-use ops code (rotate in production via SQL + service_role)
insert into public.admin_invites (code, note)
values ('VIAX-OPS-2026', 'Bootstrap operador — usar em Configurações')
on conflict (code) do nothing;

create or replace function public.claim_admin_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite admin_invites%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_code is null or length(trim(p_code)) < 6 then
    raise exception 'Invalid invite code';
  end if;

  select * into v_invite
  from public.admin_invites
  where code = trim(p_code)
  for update;

  if not found then raise exception 'Invite code not found'; end if;
  if v_invite.used_by is not null then raise exception 'Invite code already used'; end if;

  update public.admin_invites
  set used_by = v_uid, used_at = now()
  where code = trim(p_code);

  update public.profiles
  set is_admin = true
  where id = v_uid;

  return jsonb_build_object('ok', true, 'user_id', v_uid);
end;
$$;

create or replace function public.sync_admin_from_allowlist()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then return; end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return; end if;

  if exists (select 1 from public.admin_allowlist where lower(email) = lower(v_email)) then
    update public.profiles set is_admin = true where id = v_uid;
  end if;
end;
$$;

-- After profile-related auth changes, sync allowlist (called from claim + optional client)
create or replace function public.try_sync_admin_allowlist()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_admin_from_allowlist();
  return jsonb_build_object(
    'is_admin', coalesce((select is_admin from public.profiles where id = auth.uid()), false)
  );
end;
$$;

grant execute on function public.claim_admin_invite(text) to authenticated;
grant execute on function public.try_sync_admin_allowlist() to authenticated;
