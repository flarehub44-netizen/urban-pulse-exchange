-- Public resolved bets for trader profiles (read-only summary)
create or replace function public.get_public_trader_bets(p_user_id uuid)
returns table (
  id uuid,
  side text,
  stake numeric,
  payout numeric,
  market_id text,
  market_question text,
  market_region text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    b.id,
    b.side::text,
    b.stake,
    b.payout,
    b.market_id,
    m.question,
    m.region,
    b.created_at
  from public.bets b
  inner join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
    and m.status = 'resolved'
    and b.payout is not null
  order by b.created_at desc
  limit 8;
$$;

grant execute on function public.get_public_trader_bets(uuid) to authenticated;
