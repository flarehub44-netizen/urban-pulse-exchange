-- Catalog readable by anon (SSR/pre-auth) and authenticated users.

drop policy if exists "markets_read_anon" on public.markets;
create policy "markets_read_anon"
  on public.markets for select
  to anon
  using (coalesce(archived, false) = false);

drop policy if exists "market_history_read_anon" on public.market_history;
create policy "market_history_read_anon"
  on public.market_history for select
  to anon
  using (true);

drop policy if exists "regions_read_anon" on public.regions;
create policy "regions_read_anon"
  on public.regions for select
  to anon
  using (true);
