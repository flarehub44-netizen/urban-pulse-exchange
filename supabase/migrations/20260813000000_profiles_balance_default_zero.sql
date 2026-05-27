-- New signups should start with zero balance (deposits credit via payment flow).

alter table public.profiles
  alter column balance set default 0.00;
