create type market_category as enum ('Fluxo', 'Velocidade', 'Congestionamento', 'Evento');
create type market_status   as enum ('live', 'closing', 'resolved');
create type bet_side        as enum ('YES', 'NO');
create type division_tier   as enum ('Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Elite');
create type tx_type         as enum ('deposit', 'withdraw', 'entry', 'payout');
create type feed_tag        as enum ('Alerta', 'Análise', 'Previsão', 'Insight');
create type notif_kind      as enum ('win', 'alert', 'rank', 'market');
