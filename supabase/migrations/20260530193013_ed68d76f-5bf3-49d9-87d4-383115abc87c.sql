DROP VIEW IF EXISTS public.profile_public;
CREATE VIEW public.profile_public
WITH (security_invoker = true) AS
SELECT id, handle, name, avatar, city, neighborhood, division, accuracy, roi, streak, volume_24h, created_at
FROM public.profiles;

GRANT SELECT ON public.profile_public TO anon, authenticated;