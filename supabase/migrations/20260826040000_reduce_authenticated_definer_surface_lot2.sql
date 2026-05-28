-- Phase 2 (lot 2): remove authenticated EXECUTE from helper/internal SECURITY DEFINER RPCs.
-- These functions are used by server-side jobs or internally by other RPCs.

revoke execute on function public.is_football_enabled() from authenticated;
grant execute on function public.is_football_enabled() to service_role;

revoke execute on function public.get_camera_region_raw(text, text) from authenticated;
grant execute on function public.get_camera_region_raw(text, text) to service_role;

revoke execute on function public.get_camera_upstream(text) from authenticated;
grant execute on function public.get_camera_upstream(text) to service_role;

revoke execute on function public.resolve_partner_slug(text) from authenticated;
grant execute on function public.resolve_partner_slug(text) to service_role;
