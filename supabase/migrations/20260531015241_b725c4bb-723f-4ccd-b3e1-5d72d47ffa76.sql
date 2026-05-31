GRANT EXECUTE ON FUNCTION public.casino_daily_spin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.casino_quick_deposit(numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_casino_opt_out(boolean) TO authenticated;