-- Seed prediction markets: Copa outright, groups, props + vertical samples

insert into public.prediction_markets (id, question, vertical, collection_slug, status, ends_at, accept_bets)
values
  ('pm-copa-winner-2026', 'Quem vence a Copa do Mundo 2026?', 'copa', 'copa-2026', 'live', '2026-07-19 23:59:00+00', true),
  ('pm-copa-group-a', 'Vencedor do Grupo A da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-messi-plays', 'Lionel Messi vai jogar na Copa do Mundo 2026?', 'copa', 'copa-props', 'live', '2026-06-11 23:59:00+00', true),
  ('pm-pol-peru-president', 'Vencedor da eleição presidencial do Peru', 'politica', null, 'live', '2026-12-31 23:59:00+00', true),
  ('pm-crypto-btc-june', 'Qual preço o Bitcoin atinge em junho de 2026?', 'crypto', null, 'live', '2026-06-30 23:59:00+00', true),
  ('pm-tech-best-ai-june', 'Qual empresa tem o melhor modelo de IA no final de junho?', 'tech', null, 'live', '2026-06-30 23:59:00+00', true),
  ('pm-cult-neymar-goal', 'Neymar marca gol na Copa do Mundo 2026?', 'cultura', null, 'live', '2026-07-19 23:59:00+00', true)
on conflict (id) do nothing;

insert into public.market_outcomes (market_id, slug, label, sort_order) values
  ('pm-copa-winner-2026', 'bra', 'Brasil', 1),
  ('pm-copa-winner-2026', 'arg', 'Argentina', 2),
  ('pm-copa-winner-2026', 'fra', 'França', 3),
  ('pm-copa-winner-2026', 'esp', 'Espanha', 4),
  ('pm-copa-winner-2026', 'eng', 'Inglaterra', 5),
  ('pm-copa-winner-2026', 'ger', 'Alemanha', 6),
  ('pm-copa-winner-2026', 'por', 'Portugal', 7),
  ('pm-copa-winner-2026', 'ned', 'Holanda', 8),
  ('pm-copa-winner-2026', 'ita', 'Itália', 9),
  ('pm-copa-winner-2026', 'uru', 'Uruguai', 10),
  ('pm-copa-winner-2026', 'col', 'Colômbia', 11),
  ('pm-copa-winner-2026', 'mex', 'México', 12),
  ('pm-copa-group-a', 'mex', 'México', 1),
  ('pm-copa-group-a', 'kor', 'Coreia do Sul', 2),
  ('pm-copa-group-a', 'rsa', 'África do Sul', 3),
  ('pm-copa-group-a', 'den', 'Dinamarca', 4),
  ('pm-copa-messi-plays', 'yes', 'Sim', 1),
  ('pm-copa-messi-plays', 'no', 'Não', 2),
  ('pm-pol-peru-president', 'c1', 'Candidato A', 1),
  ('pm-pol-peru-president', 'c2', 'Candidato B', 2),
  ('pm-pol-peru-president', 'c3', 'Candidato C', 3),
  ('pm-crypto-btc-june', '100k', 'Acima de US$ 100k', 1),
  ('pm-crypto-btc-june', '90k', 'US$ 90k–100k', 2),
  ('pm-crypto-btc-june', '80k', 'Abaixo de US$ 80k', 3),
  ('pm-tech-best-ai-june', 'openai', 'OpenAI', 1),
  ('pm-tech-best-ai-june', 'anthropic', 'Anthropic', 2),
  ('pm-tech-best-ai-june', 'google', 'Google', 3),
  ('pm-cult-neymar-goal', 'yes', 'Sim', 1),
  ('pm-cult-neymar-goal', 'no', 'Não', 2)
on conflict (market_id, slug) do nothing;

insert into public.market_topic_assignments (market_id, source, topic_slug) values
  ('pm-copa-winner-2026', 'prediction', 'copa-2026'),
  ('pm-copa-group-a', 'prediction', 'grupos-copa'),
  ('pm-copa-messi-plays', 'prediction', 'props-copa'),
  ('pm-pol-peru-president', 'prediction', 'eleicoes'),
  ('pm-crypto-btc-june', 'prediction', 'bitcoin'),
  ('pm-tech-best-ai-june', 'prediction', 'ia'),
  ('pm-cult-neymar-goal', 'prediction', 'entretenimento')
on conflict do nothing;

insert into public.platform_settings (key, value)
values
  ('crypto_short_term_enabled', 'false'::jsonb),
  ('copa_league_ids', '[1]'::jsonb)
on conflict (key) do nothing;
