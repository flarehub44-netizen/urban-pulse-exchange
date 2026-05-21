-- Enable RLS on all user-facing tables
alter table public.profiles       enable row level security;
alter table public.markets        enable row level security;
alter table public.market_history enable row level security;
alter table public.bets           enable row level security;
alter table public.transactions   enable row level security;
alter table public.feed_posts     enable row level security;
alter table public.notifications  enable row level security;
alter table public.regions        enable row level security;

-- profiles: anyone authenticated can read, users can only update their own
create policy "profiles_read_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- markets: public read (no direct write — managed by place_bet RPC)
create policy "markets_read_all"
  on public.markets for select
  to authenticated
  using (true);

-- market_history: public read
create policy "market_history_read_all"
  on public.market_history for select
  to authenticated
  using (true);

-- bets: users see only their own
create policy "bets_read_own"
  on public.bets for select
  to authenticated
  using (auth.uid() = user_id);

-- transactions: users see only their own
create policy "transactions_read_own"
  on public.transactions for select
  to authenticated
  using (auth.uid() = user_id);

-- feed_posts: public read, authenticated insert (user_id must match)
create policy "feed_posts_read_all"
  on public.feed_posts for select
  to authenticated
  using (true);

create policy "feed_posts_insert_own"
  on public.feed_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- notifications: users see and update only their own
create policy "notifications_read_own"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- regions: public read
create policy "regions_read_all"
  on public.regions for select
  to authenticated
  using (true);
