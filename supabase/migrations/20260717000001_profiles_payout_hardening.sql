-- Remove unused Pix column from profiles; admin uses RPCs only (no broad SELECT).

alter table public.profiles drop column if exists pix_key;

drop policy if exists profiles_read_admin on public.profiles;

comment on table public.payment_intents is
  'Pix payment intents. pix_key on withdraw = user-supplied payout key at RPC time; '
  'on deposit = platform receive key from SyncPay. Inserts/updates only via service_role.';

comment on column public.payment_intents.pix_key is
  'Withdraw: user Pix key from request_withdrawal. Deposit: optional platform key metadata.';
