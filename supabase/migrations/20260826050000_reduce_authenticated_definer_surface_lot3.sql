-- Phase 2 (lot 3): revoke authenticated EXECUTE from low-usage helper/user RPCs
-- currently not called directly by the frontend codebase.

revoke execute on function public.claim_sub_partner_invite(text) from authenticated;
grant execute on function public.claim_sub_partner_invite(text) to service_role;

revoke execute on function public.get_my_partner_status() from authenticated;
grant execute on function public.get_my_partner_status() to service_role;

revoke execute on function public.get_today_poll() from authenticated;
grant execute on function public.get_today_poll() to service_role;

revoke execute on function public.is_current_user_admin() from authenticated;
grant execute on function public.is_current_user_admin() to service_role;
