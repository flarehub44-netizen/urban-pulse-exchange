-- 1. Fix function search_path mutable on check_market_alerts
ALTER FUNCTION public.check_market_alerts() SET search_path = public;

-- 2. Convert leaderboard view to security_invoker (so RLS of caller applies, not view owner)
ALTER VIEW public.leaderboard SET (security_invoker = true);

-- 3. Restrict community-covers SELECT policy to avoid bucket-wide listing.
-- Public bucket files remain accessible via the storage CDN public URL without needing a SELECT policy on storage.objects.
DROP POLICY IF EXISTS community_covers_select ON storage.objects;