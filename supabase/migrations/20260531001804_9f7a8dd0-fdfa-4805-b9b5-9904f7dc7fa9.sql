CREATE OR REPLACE FUNCTION public.resolve_community_market(p_market_id text, p_winning_side bet_side)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_market public.markets%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.market_kind is distinct from 'community' then
    raise exception 'not_community_market';
  end if;
  if v_market.created_by is distinct from v_uid then
    raise exception 'creator_only';
  end if;
  if v_market.ends_at > now() then
    raise exception 'market_still_open';
  end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'already_terminal';
  end if;

  if v_market.status in ('live', 'closing') then
    update public.markets
    set status = 'closed', accept_bets = false, updated_at = now()
    where id = p_market_id;
  end if;

  return public.settle_market(p_market_id, p_winning_side);
end;
$function$;