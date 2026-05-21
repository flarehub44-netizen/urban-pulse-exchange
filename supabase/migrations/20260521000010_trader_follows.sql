-- Trader follows (replaces localStorage for Destaques tab)
create table if not exists public.trader_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists trader_follows_follower_idx on public.trader_follows(follower_id);
create index if not exists trader_follows_following_idx on public.trader_follows(following_id);

alter table public.trader_follows enable row level security;

create policy "trader_follows_read_own"
  on public.trader_follows for select to authenticated
  using (auth.uid() = follower_id);

create policy "trader_follows_insert_own"
  on public.trader_follows for insert to authenticated
  with check (auth.uid() = follower_id);

create policy "trader_follows_delete_own"
  on public.trader_follows for delete to authenticated
  using (auth.uid() = follower_id);

-- List ids the current user follows
create or replace function public.get_following_trader_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select following_id from public.trader_follows where follower_id = auth.uid();
$$;

grant execute on function public.get_following_trader_ids() to authenticated;

create or replace function public.toggle_trader_follow(p_following_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if v_uid = p_following_id then raise exception 'Cannot follow yourself'; end if;

  select exists(
    select 1 from public.trader_follows
    where follower_id = v_uid and following_id = p_following_id
  ) into v_exists;

  if v_exists then
    delete from public.trader_follows where follower_id = v_uid and following_id = p_following_id;
    return false;
  else
    insert into public.trader_follows (follower_id, following_id) values (v_uid, p_following_id);
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_trader_follow(uuid) to authenticated;
