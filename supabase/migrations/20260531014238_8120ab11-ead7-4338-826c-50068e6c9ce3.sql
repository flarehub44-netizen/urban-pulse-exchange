CREATE OR REPLACE FUNCTION public.refresh_profile_stats(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_wins   int;
  v_total  int;
  v_staked numeric;
  v_returned numeric;
begin
  select
    count(*) filter (where b.payout is not null and b.payout > 0),
    count(*),
    coalesce(sum(b.stake), 0),
    coalesce(sum(b.payout), 0)
  into v_wins, v_total, v_staked, v_returned
  from public.bets b
  inner join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
    and m.status in ('settled', 'resolved', 'void');

  if v_total = 0 then
    return;
  end if;

  perform set_config('viax.progression', 'on', true);

  update public.profiles
  set
    accuracy = round(v_wins::numeric / v_total, 4),
    roi = case when v_staked > 0 then round((v_returned - v_staked) / v_staked, 4) else 0 end
  where id = p_user_id;

  perform set_config('viax.progression', 'off', true);
exception
  when others then
    perform set_config('viax.progression', 'off', true);
    raise;
end;
$function$;