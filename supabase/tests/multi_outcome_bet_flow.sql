-- Multi-outcome bet flow — parimutuel math + RPC smoke (rollback)

begin;

do $$
declare
  v_total numeric := 1000 + 500 + 300;
  v_share numeric;
  v_prize numeric := v_total * 0.9;
begin
  assert (select count(*) >= 1 from pg_proc where proname = 'place_outcome_bet');
  assert (select count(*) >= 1 from pg_proc where proname = 'settle_outcome_market');
  v_share := 200::numeric / (300 + 200);
  assert round(v_share * v_prize, 2) = round(0.4 * 1350, 2);
  raise notice 'multi_outcome parimutuel math: OK';
end;
$$;

select count(*) >= 32 as copa_outcomes_ok
from public.market_outcomes where market_id = 'pm-copa-winner-2026';

select count(*) >= 5 as economia_live_ok
from public.prediction_markets where vertical = 'economia' and status = 'live';

rollback;
