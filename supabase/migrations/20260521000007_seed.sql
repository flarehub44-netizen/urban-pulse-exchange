-- Bypass FK checks for seeding demo data that has no auth.users rows.
-- Real user profiles are created by the on_auth_user_created trigger.
set session_replication_role = 'replica';

-- UrbanMind AI profile
insert into public.profiles (id, name, handle, avatar, division, balance, accuracy, roi, streak, is_ai)
values (
  '00000000-0000-0000-0000-000000000001',
  'UrbanMind AI',
  'urbanmind_ai',
  'https://api.dicebear.com/9.x/identicon/svg?seed=UrbanMind',
  'Elite', 9999999, 0.834, 1.62, 42, true
);

-- 10 demo traders
insert into public.profiles (id, name, handle, avatar, division, accuracy, roi, streak, volume_24h, city, neighborhood) values
  ('10000000-0000-0000-0000-000000000001', 'Lucas Andrade',   'lucasalpha',   'https://api.dicebear.com/9.x/glass/svg?seed=Alpha',   'Elite',    0.812, 1.47, 14, 184200, 'São Paulo', 'Pinheiros'),
  ('10000000-0000-0000-0000-000000000002', 'Marina Costa',    'mc_oracle',    'https://api.dicebear.com/9.x/glass/svg?seed=Beta',    'Diamante', 0.787, 1.31, 9,  142800, 'São Paulo', 'Vila Mariana'),
  ('10000000-0000-0000-0000-000000000003', 'Rafa Tanaka',     'rafarush',     'https://api.dicebear.com/9.x/glass/svg?seed=Gamma',   'Diamante', 0.764, 1.22, 11, 128100, 'São Paulo', 'Moema'),
  ('10000000-0000-0000-0000-000000000004', 'Bianca Reis',     'bia_predicts', 'https://api.dicebear.com/9.x/glass/svg?seed=Delta',   'Platina',  0.742, 1.14, 6,  98700,  'Campinas',  'Cambuí'),
  ('10000000-0000-0000-0000-000000000005', 'Diego Vargas',    'dv_quant',     'https://api.dicebear.com/9.x/glass/svg?seed=Epsilon', 'Platina',  0.733, 1.09, 4,  88600,  'São Paulo', 'Tatuapé'),
  ('10000000-0000-0000-0000-000000000006', 'Helena Mori',     'helmori',      'https://api.dicebear.com/9.x/glass/svg?seed=Zeta',    'Ouro',     0.701, 0.92, 5,  72400,  'São Paulo', 'Lapa'),
  ('10000000-0000-0000-0000-000000000007', 'Igor Pereira',    'igorflux',     'https://api.dicebear.com/9.x/glass/svg?seed=Eta',     'Ouro',     0.688, 0.86, 3,  61500,  'Santos',    'Gonzaga'),
  ('10000000-0000-0000-0000-000000000008', 'Sofia Liu',       'sof.liu',      'https://api.dicebear.com/9.x/glass/svg?seed=Theta',   'Prata',    0.652, 0.74, 2,  42100,  'São Paulo', 'Brooklin'),
  ('10000000-0000-0000-0000-000000000009', 'Pedro Ramos',     'pedror',       'https://api.dicebear.com/9.x/glass/svg?seed=Iota',    'Prata',    0.641, 0.68, 1,  38900,  'São Paulo', 'Santana'),
  ('10000000-0000-0000-0000-000000000010', 'Cris Bertolini',  'crisb',        'https://api.dicebear.com/9.x/glass/svg?seed=Kappa',   'Bronze',   0.602, 0.51, 0,  21400,  'São Paulo', 'Mooca');

set session_replication_role = 'origin';

-- Markets
insert into public.markets (id, question, region, target, category, ends_at, pool_yes, pool_no, participants, ai_side, ai_value, ai_confidence, status) values
  ('paulista-rush',  'Mais de 5.200 carros passarão na Av. Paulista entre 18h–19h?',            'Av. Paulista · SP',   5200,  'Fluxo',           now() + interval '42 min',  72400, 31200, 578, 'YES', 5432, 0.82, 'live'),
  ('marginal-tietê', 'Velocidade média na Marginal Tietê ficará abaixo de 18 km/h às 19h?',     'Marginal Tietê',      18,    'Velocidade',       now() + interval '28 min',  48900, 56100, 376, 'NO',  16,   0.71, 'closing'),
  ('faria-lima',     'Mais de 3.400 carros na Faria Lima entre 17h–18h?',                        'Faria Lima',          3400,  'Fluxo',            now() + interval '12 min',  38200, 22100, 336, 'YES', 3580, 0.76, 'closing'),
  ('23-maio',        'Congestionamento na 23 de Maio passará de 8 km às 18h30?',                 '23 de Maio',          8,     'Congestionamento', now() + interval '65 min',  29800, 41200, 394, 'NO',  7,    0.64, 'live'),
  ('rebouças',       'Velocidade média na Av. Rebouças abaixo de 22 km/h às 19h?',               'Av. Rebouças',        22,    'Velocidade',       now() + interval '91 min',  18400, 12900, 174, 'YES', 20,   0.69, 'live'),
  ('anhangabaú',     'Pico de pedestres no Vale do Anhangabaú ultrapassará 12k às 18h?',         'Vale do Anhangabaú',  12000, 'Evento',           now() + interval '134 min', 9800,  11400, 186, 'NO',  11200,0.58, 'live'),
  ('imigrantes',     'Tempo médio Imigrantes → Cubatão ficará acima de 95 min às 18h?',          'Rod. dos Imigrantes', 95,    'Velocidade',       now() + interval '178 min', 24600, 18300, 240, 'YES', 98,   0.74, 'live'),
  ('brigadeiro',     'Mais de 2.100 carros na Brigadeiro entre 18h–19h?',                        'Av. Brigadeiro',      2100,  'Fluxo',            now() + interval '7 min',   14200, 17800, 178, 'NO',  1980, 0.61, 'closing');

-- Seed initial market_history (40 probability snapshots per market)
insert into public.market_history (market_id, p, recorded_at)
select
  m.id,
  greatest(0.05, least(0.95,
    (m.pool_yes / (m.pool_yes + m.pool_no))
    + (sin(s.n / 4.0) + cos(s.n / 7.0)) * 0.05
  )),
  now() - (40 - s.n) * interval '1 minute'
from public.markets m
cross join generate_series(0, 39) as s(n);

-- Regions
insert into public.regions (id, name, congestion, flow, avg_speed, x, y, r) values
  ('centro',      'Centro',         0.78, 5240, 14,   50, 50, 9),
  ('paulista',    'Av. Paulista',   0.88, 5180, 12,   46, 54, 7),
  ('fariaLima',   'Faria Lima',     0.71, 3320, 19,   36, 58, 6),
  ('marginal',    'Marginal Tietê', 0.92, 8900, 11,   54, 32, 10),
  ('pinheiros',   'Pinheiros',      0.55, 2780, 24,   32, 52, 6),
  ('vilaMariana', 'Vila Mariana',   0.41, 1900, 28,   55, 64, 5),
  ('moema',       'Moema',          0.36, 1620, 31,   48, 70, 5),
  ('tatuapé',     'Tatuapé',        0.62, 2940, 22,   70, 44, 5),
  ('lapa',        'Lapa',           0.49, 2100, 26,   28, 38, 5),
  ('santana',     'Santana',        0.34, 1480, 33,   52, 22, 5);

-- Feed posts
insert into public.feed_posts (user_id, text, market_id, tag, likes, comments, reposts, created_at) values
  ('10000000-0000-0000-0000-000000000001', 'Acidente na Marginal entre Cebolão e Lapa derruba fluxo em 22%. Probabilidade do NÃO no mercado da Marginal sobe para 58%.', 'marginal-tietê', 'Alerta',   184, 32, 41,  now() - interval '3 min'),
  ('10000000-0000-0000-0000-000000000002', 'Histórico: chuva forte em Pinheiros reduz fluxo na Faria Lima em ~18%. Estou no NÃO hoje.',                                  'faria-lima',     'Análise',  96,  14, 22,  now() - interval '11 min'),
  ('10000000-0000-0000-0000-000000000003', 'UrbanMind está com 82% no SIM da Paulista. Eu acompanho — fluxo dos últimos 5 dias confirma.',                               'paulista-rush',  'Previsão', 142, 28, 36,  now() - interval '18 min'),
  ('10000000-0000-0000-0000-000000000004', 'Padrão de quartas-feiras: pico de fluxo na 23 de Maio acontece 15 min antes. Cuidado com a hora de fechamento.',             '23-maio',        'Insight',  71,  9,  12,  now() - interval '24 min'),
  ('10000000-0000-0000-0000-000000000005', 'Volume entrando pesado no SIM da Faria Lima. +R$ 6.8k nos últimos 4 min.',                                                   'faria-lima',     null,       58,  6,  9,   now() - interval '30 min'),
  ('10000000-0000-0000-0000-000000000006', 'Bati 9 acertos seguidos obrigado UrbanMind por confirmar minha leitura na Rebouças.',                                        'rebouças',       null,       211, 47, 19,  now() - interval '41 min'),
  ('10000000-0000-0000-0000-000000000007', 'Show da Madonna no Vale do Anhangabaú lotou. Pedestres acima do esperado.',                                                  'anhangabaú',     'Alerta',   312, 88, 122, now() - interval '55 min'),
  ('10000000-0000-0000-0000-000000000008', 'Imigrantes no NÃO parece teto barato — chuva no litoral já começou.',                                                        'imigrantes',     'Análise',  44,  5,  7,   now() - interval '72 min');
