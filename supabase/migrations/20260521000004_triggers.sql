-- Auto-create profile on anonymous or regular sign-in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rand_suffix text := lower(substr(md5(random()::text), 1, 6));
begin
  insert into public.profiles (id, handle, avatar, name)
  values (
    new.id,
    'viax_' || rand_suffix,
    'https://api.dicebear.com/9.x/glass/svg?seed=' || rand_suffix,
    'Trader ' || upper(rand_suffix)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Snapshot market probability into history whenever pool changes
create or replace function public.snapshot_market_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.pool_yes + new.pool_no) > 0 then
    insert into public.market_history (market_id, p)
    values (new.id, new.pool_yes / (new.pool_yes + new.pool_no));
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger markets_pool_changed
  before update of pool_yes, pool_no on public.markets
  for each row execute procedure public.snapshot_market_history();
