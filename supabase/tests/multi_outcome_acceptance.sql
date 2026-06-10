-- Acceptance tests for multi-outcome parimutuel

begin;

select 1 from pg_proc where proname = 'place_outcome_bet';
select 1 from pg_proc where proname = 'list_catalog_markets';
select 1 from pg_proc where proname = 'settle_outcome_market';
select 1 from pg_proc where proname = 'admin_void_prediction_market';
select 1 from pg_proc where proname = 'admin_update_prediction_market';

select count(*) >= 1 as has_copa_winner
from public.prediction_markets where id = 'pm-copa-winner-2026';

select count(*) >= 32 as has_thirtytwo_outcomes
from public.market_outcomes where market_id = 'pm-copa-winner-2026';

select count(*) >= 5 as politica_markets
from public.prediction_markets where vertical = 'politica' and status = 'live';

select count(*) >= 5 as economia_markets
from public.prediction_markets where vertical = 'economia' and status = 'live';

select count(*) >= 12 as copa_group_markets
from public.prediction_markets where id like 'pm-copa-group-%';

rollback;
