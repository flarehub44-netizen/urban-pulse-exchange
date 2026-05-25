-- Grant admin to douglapinheirosantos@gmail.com (allowlist + profile flag)

insert into public.admin_allowlist (email, note)
values ('douglapinheirosantos@gmail.com', 'Operador principal')
on conflict (email) do update set note = excluded.note;

alter table public.profiles disable trigger profiles_guard_sensitive;

update public.profiles p
set is_admin = true
from auth.users u
where u.id = p.id
  and lower(u.email) = lower('douglapinheirosantos@gmail.com');

alter table public.profiles enable trigger profiles_guard_sensitive;
