-- Restrict direct profile reads: own row + admins only.
-- Public trader stats remain available via leaderboard view (definer, no balance/is_admin).

create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "profiles_read_all" on public.profiles;

create policy "profiles_read_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_read_admin"
  on public.profiles for select
  to authenticated
  using (public.is_current_user_admin());

-- Leaderboard runs as view owner so it can aggregate public stats without opening profiles table.
alter view public.leaderboard set (security_invoker = false);

grant select on public.leaderboard to authenticated, anon;
