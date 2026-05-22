-- Expands platform_ledger.kind check constraint to support refund and dispute_resolution entries.
-- Previous constraint only allowed 'house_fee', blocking future financial event categories.
alter table public.platform_ledger
  drop constraint if exists platform_ledger_kind_check;

alter table public.platform_ledger
  add constraint platform_ledger_kind_check
    check (kind in ('house_fee', 'refund', 'dispute_resolution'));
