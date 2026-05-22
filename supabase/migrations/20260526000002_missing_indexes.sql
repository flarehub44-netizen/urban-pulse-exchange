-- Adds indexes identified as missing during audit.

-- Reverse follower lookup: "who follows user X?"
create index if not exists trader_follows_following_idx
  on public.trader_follows(following_id);

-- Composite lookup: "has this user already bet on this market?"
create index if not exists bets_user_market_idx
  on public.bets(user_id, market_id);
