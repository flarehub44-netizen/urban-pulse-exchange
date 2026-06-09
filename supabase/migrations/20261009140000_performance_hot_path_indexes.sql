-- Hot-path indexes for wallet, funnel, reconciliation, dashboard.

create index if not exists transactions_user_created_desc_idx
  on public.transactions (user_id, created_at desc);

create index if not exists deposit_funnel_events_created_at_idx
  on public.deposit_funnel_events (created_at desc);

create index if not exists payment_intents_status_created_idx
  on public.payment_intents (status, created_at desc);

create index if not exists bets_user_open_idx
  on public.bets (user_id, created_at desc)
  where payout is null;
