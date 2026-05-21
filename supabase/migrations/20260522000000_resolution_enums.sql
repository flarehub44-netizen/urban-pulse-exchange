-- Enum extensions must commit before use (Postgres 55P04)
alter type public.market_status add value if not exists 'closed';
alter type public.market_status add value if not exists 'resolving';
alter type public.market_status add value if not exists 'dispute';
alter type public.market_status add value if not exists 'settled';
alter type public.market_status add value if not exists 'void';

alter type public.tx_type add value if not exists 'refund';
alter type public.tx_type add value if not exists 'house_fee';

alter type public.notif_kind add value if not exists 'refund';
alter type public.notif_kind add value if not exists 'void';
