-- Returns active bets from all traders the current user follows.
-- Used in dashboard "O que seus traders seguidos estão prevendo".
-- 5 minute delay prevents real-time front-running.
CREATE OR REPLACE FUNCTION public.get_following_active_bets()
RETURNS TABLE (
  bet_id          uuid,
  trader_id       uuid,
  trader_name     text,
  trader_handle   text,
  trader_avatar   text,
  side            text,
  market_id       text,
  market_question text,
  market_region   text,
  market_ends_at  timestamptz,
  bet_created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    p.id,
    p.name,
    p.handle,
    p.avatar,
    b.side::text,
    b.market_id,
    m.question,
    m.region,
    m.ends_at,
    b.created_at
  FROM public.bets b
  INNER JOIN public.markets m    ON m.id = b.market_id
  INNER JOIN public.profiles p   ON p.id = b.user_id
  INNER JOIN public.trader_follows f
    ON f.following_id = b.user_id AND f.follower_id = auth.uid()
  WHERE m.status IN ('live', 'closing')
    AND b.payout IS NULL
    AND b.created_at < now() - interval '5 minutes'
  ORDER BY b.created_at DESC
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.get_following_active_bets() TO authenticated;
