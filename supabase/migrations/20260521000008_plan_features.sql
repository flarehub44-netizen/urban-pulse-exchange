-- Plan features: feed interactions, market book RPC, resolve market, notification prefs

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{"wins":true,"markets":true,"ranking":false,"alerts":true}'::jsonb;

create table if not exists public.feed_likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.feed_reposts (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table if not exists public.feed_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.feed_posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 280),
  created_at timestamptz not null default now()
);
create index if not exists feed_comments_post_idx on public.feed_comments(post_id, created_at desc);

alter table public.feed_likes    enable row level security;
alter table public.feed_reposts  enable row level security;
alter table public.feed_comments enable row level security;

create policy "feed_likes_read_all" on public.feed_likes for select to authenticated using (true);
create policy "feed_likes_insert_own" on public.feed_likes for insert to authenticated with check (auth.uid() = user_id);

create policy "feed_reposts_read_all" on public.feed_reposts for select to authenticated using (true);
create policy "feed_reposts_insert_own" on public.feed_reposts for insert to authenticated with check (auth.uid() = user_id);

create policy "feed_comments_read_all" on public.feed_comments for select to authenticated using (true);
create policy "feed_comments_insert_own" on public.feed_comments for insert to authenticated with check (auth.uid() = user_id);

-- Recent bets for market detail (public activity, no user_id exposed)
create or replace function public.get_market_recent_bets(p_market_id text, p_limit int default 12)
returns table (
  side       bet_side,
  stake      numeric,
  share      numeric,
  handle     text,
  name       text,
  avatar     text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select b.side, b.stake, b.share, p.handle, p.name, p.avatar, b.created_at
  from public.bets b
  join public.profiles p on p.id = b.user_id
  where b.market_id = p_market_id
  order by b.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.get_market_recent_bets(text, int) to authenticated;

-- Resolve market and pay winners (90% prize pool)
create or replace function public.resolve_market(
  p_market_id   text,
  p_winning_side bet_side
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market     markets%rowtype;
  v_prize      numeric;
  v_pool_win   numeric;
  v_bet        record;
  v_payout     numeric;
  v_paid       int := 0;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status = 'resolved' then raise exception 'Market already resolved'; end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * 0.9;
  if p_winning_side = 'YES' then v_pool_win := v_market.pool_yes; else v_pool_win := v_market.pool_no; end if;

  update public.markets
  set status = 'resolved', resolved = p_winning_side, updated_at = now()
  where id = p_market_id;

  if v_pool_win > 0 then
    for v_bet in
      select b.id, b.user_id, b.stake, b.share
      from public.bets b
      where b.market_id = p_market_id and b.side = p_winning_side and b.payout is null
    loop
      v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
      update public.bets set payout = v_payout where id = v_bet.id;
      update public.profiles set balance = balance + v_payout, pnl = pnl + (v_payout - v_bet.stake) where id = v_bet.user_id;
      insert into public.transactions (user_id, type, market_id, market_label, amount)
      values (v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout);
      insert into public.notifications (user_id, kind, text)
      values (v_bet.user_id, 'win', 'Payout de ' || v_payout::text || ' no mercado ' || v_market.region);
      v_paid := v_paid + 1;
    end loop;
  end if;

  return jsonb_build_object('market_id', p_market_id, 'winning_side', p_winning_side, 'payouts', v_paid);
end;
$$;

grant execute on function public.resolve_market(text, bet_side) to authenticated;

-- Auto-resolve expired markets using UrbanMind side (demo oracle)
create or replace function public.resolve_expired_markets()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   markets%rowtype;
  v_count int := 0;
begin
  for v_row in
    select * from public.markets
    where status != 'resolved' and ends_at <= now()
    for update skip locked
  loop
    perform public.resolve_market(v_row.id, v_row.ai_side);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.resolve_expired_markets() to authenticated;

create or replace function public.like_feed_post(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int;
  v_likes int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  insert into public.feed_likes (user_id, post_id) values (v_uid, p_post_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.feed_posts set likes = likes + 1 where id = p_post_id returning likes into v_likes;
  else
    select likes into v_likes from public.feed_posts where id = p_post_id;
  end if;
  return coalesce(v_likes, 0);
end;
$$;

create or replace function public.repost_feed_post(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int;
  v_reposts int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  insert into public.feed_reposts (user_id, post_id) values (v_uid, p_post_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.feed_posts set reposts = reposts + 1 where id = p_post_id returning reposts into v_reposts;
  else
    select reposts into v_reposts from public.feed_posts where id = p_post_id;
  end if;
  return coalesce(v_reposts, 0);
end;
$$;

create or replace function public.comment_feed_post(p_post_id uuid, p_text text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_comments int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if char_length(trim(p_text)) < 1 then raise exception 'Comment too short'; end if;
  insert into public.feed_comments (post_id, user_id, text) values (p_post_id, v_uid, trim(p_text));
  update public.feed_posts set comments = comments + 1 where id = p_post_id returning comments into v_comments;
  return coalesce(v_comments, 0);
end;
$$;

grant execute on function public.like_feed_post(uuid) to authenticated;
grant execute on function public.repost_feed_post(uuid) to authenticated;
grant execute on function public.comment_feed_post(uuid, text) to authenticated;
