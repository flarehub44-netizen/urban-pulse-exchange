-- Returns active (open) bets of a trader for copy-trading feature.
-- Only shows side (not stake) to preserve privacy.
-- Excludes bets from last 5 minutes to prevent real-time front-running.
CREATE OR REPLACE FUNCTION public.get_public_active_bets(p_user_id uuid)
RETURNS TABLE (
  id           uuid,
  side         text,
  market_id    text,
  market_question text,
  market_region   text,
  market_ends_at  timestamptz,
  created_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id,
    b.side::text,
    b.market_id,
    m.question,
    m.region,
    m.ends_at,
    b.created_at
  FROM public.bets b
  INNER JOIN public.markets m ON m.id = b.market_id
  WHERE b.user_id = p_user_id
    AND m.status IN ('live', 'closing')
    AND b.payout IS NULL
    AND b.created_at < now() - interval '5 minutes'
  ORDER BY b.created_at DESC
  LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_active_bets(uuid) TO authenticated;
