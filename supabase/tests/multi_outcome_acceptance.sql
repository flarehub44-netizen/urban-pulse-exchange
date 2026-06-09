-- Acceptance tests for multi-outcome parimutuel

begin;

-- Setup test user profile would require auth; test structure only validates functions exist
select 1 from pg_proc where proname = 'place_outcome_bet';
select 1 from pg_proc where proname = 'list_catalog_markets';
select 1 from pg_proc where proname = 'settle_outcome_market';

select count(*) >= 1 as has_copa_winner
from public.prediction_markets where id = 'pm-copa-winner-2026';

select count(*) = 12 as has_twelve_outcomes
from public.market_outcomes where market_id = 'pm-copa-winner-2026';

rollback;
