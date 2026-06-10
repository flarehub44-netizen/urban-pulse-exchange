-- Gaps expansion: admin void/edit + editorial seeds (≥5/vertical, economia, Copa 32+)

-- ---------------------------------------------------------------------------
-- admin_void_prediction_market
-- ---------------------------------------------------------------------------
create or replace function public.admin_void_prediction_market(
  p_market_id text,
  p_reason text default 'admin_void'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.prediction_markets%rowtype;
  v_bet record;
  v_count int := 0;
  v_total numeric := 0;
  v_reason text := coalesce(nullif(trim(p_reason), ''), 'admin_void');
begin
  perform public.assert_admin();

  select * into v_m from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status in ('settled', 'void', 'resolved') then
    raise exception 'Market already finalized (status=%)', v_m.status;
  end if;

  for v_bet in
    select id, user_id, stake from public.outcome_bets
    where market_id = p_market_id and payout is null
  loop
    update public.outcome_bets set payout = 0 where id = v_bet.id;
    update public.profiles set balance = balance + v_bet.stake where id = v_bet.user_id;
    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'refund', p_market_id, left(v_m.question, 80), v_bet.stake);
    insert into public.notifications (user_id, kind, text, market_id)
    values (
      v_bet.user_id,
      'void',
      'Reembolso de ' || v_bet.stake::text || ' — ' || v_reason,
      p_market_id
    );
    v_count := v_count + 1;
    v_total := v_total + v_bet.stake;
  end loop;

  update public.prediction_markets
  set status = 'void', accept_bets = false, updated_at = now()
  where id = p_market_id;

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', 'void',
    'refunds', v_count,
    'total_refunded', v_total
  );
end;
$$;

revoke execute on function public.admin_void_prediction_market(text, text) from public;
grant execute on function public.admin_void_prediction_market(text, text) to authenticated;
grant execute on function public.admin_void_prediction_market(text, text) to service_role;

-- ---------------------------------------------------------------------------
-- admin_update_prediction_market (question, deadline, outcome labels)
-- ---------------------------------------------------------------------------
create or replace function public.admin_update_prediction_market(
  p_market_id text,
  p_question text default null,
  p_ends_at timestamptz default null,
  p_outcomes jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.prediction_markets%rowtype;
  v_o jsonb;
  v_id uuid;
  v_slug text;
  v_label text;
  v_updated int := 0;
begin
  perform public.assert_admin();

  select * into v_m from public.prediction_markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_m.status in ('settled', 'void', 'resolved') then
    raise exception 'Cannot edit finalized market';
  end if;

  update public.prediction_markets
  set
    question = coalesce(nullif(trim(p_question), ''), question),
    ends_at = coalesce(p_ends_at, ends_at),
    updated_at = now()
  where id = p_market_id;

  if p_outcomes is not null then
    for v_o in select * from jsonb_array_elements(p_outcomes)
    loop
      v_id := (v_o->>'id')::uuid;
      v_slug := v_o->>'slug';
      v_label := v_o->>'label';
      if v_label is null or trim(v_label) = '' then continue; end if;

      if v_id is not null then
        update public.market_outcomes
        set label = v_label
        where id = v_id and market_id = p_market_id;
      elsif v_slug is not null then
        update public.market_outcomes
        set label = v_label
        where slug = v_slug and market_id = p_market_id;
      end if;
      v_updated := v_updated + 1;
    end loop;
  end if;

  return jsonb_build_object('id', p_market_id, 'outcomes_updated', v_updated);
end;
$$;

revoke execute on function public.admin_update_prediction_market(text, text, timestamptz, jsonb) from public;
grant execute on function public.admin_update_prediction_market(text, text, timestamptz, jsonb) to authenticated;
grant execute on function public.admin_update_prediction_market(text, text, timestamptz, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Copa outright: expand to 32+ selections
-- ---------------------------------------------------------------------------
insert into public.market_outcomes (market_id, slug, label, sort_order) values
  ('pm-copa-winner-2026', 'usa', 'Estados Unidos', 13),
  ('pm-copa-winner-2026', 'can', 'Canadá', 14),
  ('pm-copa-winner-2026', 'ecu', 'Equador', 15),
  ('pm-copa-winner-2026', 'per', 'Peru', 16),
  ('pm-copa-winner-2026', 'chl', 'Chile', 17),
  ('pm-copa-winner-2026', 'par', 'Paraguai', 18),
  ('pm-copa-winner-2026', 'crc', 'Costa Rica', 19),
  ('pm-copa-winner-2026', 'mar', 'Marrocos', 20),
  ('pm-copa-winner-2026', 'sen', 'Senegal', 21),
  ('pm-copa-winner-2026', 'jpn', 'Japão', 22),
  ('pm-copa-winner-2026', 'aus', 'Austrália', 23),
  ('pm-copa-winner-2026', 'irn', 'Irã', 24),
  ('pm-copa-winner-2026', 'sau', 'Arábia Saudita', 25),
  ('pm-copa-winner-2026', 'qat', 'Catar', 26),
  ('pm-copa-winner-2026', 'pol', 'Polônia', 27),
  ('pm-copa-winner-2026', 'bel', 'Bélgica', 28),
  ('pm-copa-winner-2026', 'cro', 'Croácia', 29),
  ('pm-copa-winner-2026', 'swe', 'Suécia', 30),
  ('pm-copa-winner-2026', 'sui', 'Suíça', 31),
  ('pm-copa-winner-2026', 'ukr', 'Ucrânia', 32),
  ('pm-copa-winner-2026', 'tur', 'Turquia', 33)
on conflict (market_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Copa group winner markets B–L
-- ---------------------------------------------------------------------------
insert into public.prediction_markets (id, question, vertical, collection_slug, status, ends_at, accept_bets)
values
  ('pm-copa-group-b', 'Vencedor do Grupo B da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-c', 'Vencedor do Grupo C da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-d', 'Vencedor do Grupo D da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-e', 'Vencedor do Grupo E da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-f', 'Vencedor do Grupo F da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-g', 'Vencedor do Grupo G da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-h', 'Vencedor do Grupo H da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-i', 'Vencedor do Grupo I da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-j', 'Vencedor do Grupo J da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-k', 'Vencedor do Grupo K da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true),
  ('pm-copa-group-l', 'Vencedor do Grupo L da Copa do Mundo', 'copa', 'copa-2026', 'live', '2026-06-28 23:59:00+00', true)
on conflict (id) do nothing;

insert into public.market_outcomes (market_id, slug, label, sort_order) values
  ('pm-copa-group-b', 'can', 'Canadá', 1), ('pm-copa-group-b', 'qat', 'Catar', 2),
  ('pm-copa-group-b', 'sui', 'Suíça', 3), ('pm-copa-group-b', 'sen', 'Senegal', 4),
  ('pm-copa-group-c', 'bra', 'Brasil', 1), ('pm-copa-group-c', 'mar', 'Marrocos', 2),
  ('pm-copa-group-c', 'hti', 'Haiti', 3), ('pm-copa-group-c', 'sco', 'Escócia', 4),
  ('pm-copa-group-d', 'usa', 'Estados Unidos', 1), ('pm-copa-group-d', 'par', 'Paraguai', 2),
  ('pm-copa-group-d', 'aus', 'Austrália', 3), ('pm-copa-group-d', 'tur', 'Turquia', 4),
  ('pm-copa-group-e', 'ger', 'Alemanha', 1), ('pm-copa-group-e', 'ecu', 'Equador', 2),
  ('pm-copa-group-e', 'civ', 'Costa do Marfim', 3), ('pm-copa-group-e', 'cuw', 'Curaçao', 4),
  ('pm-copa-group-f', 'ned', 'Holanda', 1), ('pm-copa-group-f', 'jpn', 'Japão', 2),
  ('pm-copa-group-f', 'tun', 'Tunísia', 3), ('pm-copa-group-f', 'nor', 'Noruega', 4),
  ('pm-copa-group-g', 'bel', 'Bélgica', 1), ('pm-copa-group-g', 'egy', 'Egito', 2),
  ('pm-copa-group-g', 'irn', 'Irã', 3), ('pm-copa-group-g', 'nzl', 'Nova Zelândia', 4),
  ('pm-copa-group-h', 'esp', 'Espanha', 1), ('pm-copa-group-h', 'crc', 'Costa Rica', 2),
  ('pm-copa-group-h', 'cpv', 'Cabo Verde', 3), ('pm-copa-group-h', 'ksa', 'Arábia Saudita', 4),
  ('pm-copa-group-i', 'fra', 'França', 1), ('pm-copa-group-i', 'sen', 'Senegal', 2),
  ('pm-copa-group-i', 'bol', 'Bolívia', 3), ('pm-copa-group-i', 'nor', 'Noruega', 4),
  ('pm-copa-group-j', 'arg', 'Argentina', 1), ('pm-copa-group-j', 'alg', 'Argélia', 2),
  ('pm-copa-group-j', 'aut', 'Áustria', 3), ('pm-copa-group-j', 'jor', 'Jordânia', 4),
  ('pm-copa-group-k', 'por', 'Portugal', 1), ('pm-copa-group-k', 'col', 'Colômbia', 2),
  ('pm-copa-group-k', 'uzb', 'Uzbequistão', 3), ('pm-copa-group-k', 'nzl', 'Nova Zelândia', 4),
  ('pm-copa-group-l', 'eng', 'Inglaterra', 1), ('pm-copa-group-l', 'cro', 'Croácia', 2),
  ('pm-copa-group-l', 'gha', 'Gana', 3), ('pm-copa-group-l', 'pan', 'Panamá', 4)
on conflict (market_id, slug) do nothing;

insert into public.market_topic_assignments (market_id, source, topic_slug)
select id, 'prediction', 'grupos-copa'
from public.prediction_markets
where id like 'pm-copa-group-%'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Vertical editorial seeds (≥5 each including existing)
-- ---------------------------------------------------------------------------
insert into public.prediction_markets (id, question, vertical, status, ends_at, accept_bets)
values
  ('pm-pol-brazil-mayor-sp', 'Quem vence a eleição para prefeito de São Paulo em 2026?', 'politica', 'live', '2026-10-31 23:59:00+00', true),
  ('pm-pol-us-midterms', 'Qual partido controla a Câmara dos EUA após as eleições de 2026?', 'politica', 'live', '2026-11-04 23:59:00+00', true),
  ('pm-pol-uk-election', 'Partido vencedor das eleições gerais no Reino Unido', 'politica', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-pol-france-president', 'Próximo presidente da França eleito antes de 2027?', 'politica', 'live', '2027-05-01 23:59:00+00', true),
  ('pm-crypto-eth-june', 'Qual faixa o Ethereum fecha em junho de 2026?', 'crypto', 'live', '2026-06-30 23:59:00+00', true),
  ('pm-crypto-sol-ath', 'Solana atinge novo ATH em 2026?', 'crypto', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-crypto-etf-flows', 'ETFs de Bitcoin nos EUA registram mês positivo em junho?', 'crypto', 'live', '2026-06-30 23:59:00+00', true),
  ('pm-crypto-stable-reg', 'Nova regulamentação de stablecoins nos EUA em 2026?', 'crypto', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-tech-apple-ai', 'Apple lança assistente de IA standalone em 2026?', 'tech', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-tech-spacex-starship', 'SpaceX Starship completa missão orbital comercial em 2026?', 'tech', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-tech-nvidia-4t', 'NVIDIA ultrapassa US$ 4T de market cap em 2026?', 'tech', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-tech-open-source-llm', 'Qual open-source LLM lidera benchmarks em dez/2026?', 'tech', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-cult-oscar-best', 'Melhor filme no Oscar 2027', 'cultura', 'live', '2027-03-01 23:59:00+00', true),
  ('pm-cult-bbb26', 'Quem vence o BBB 26?', 'cultura', 'live', '2026-04-30 23:59:00+00', true),
  ('pm-cult-taylor-tour', 'Taylor Swift anuncia nova turnê mundial em 2026?', 'cultura', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-cult-streaming-war', 'Qual streaming lidera assinantes globais em 2026?', 'cultura', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-eco-selic-dec', 'Nível da Selic ao fim de 2026', 'economia', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-eco-ipca-june', 'IPCA acumulado em junho de 2026 fica abaixo de 0,5%?', 'economia', 'live', '2026-06-30 23:59:00+00', true),
  ('pm-eco-us-recession', 'EUA entram em recessão técnica em 2026?', 'economia', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-eco-brl-usd', 'Dólar comercial fecha 2026 abaixo de R$ 5,00?', 'economia', 'live', '2026-12-31 23:59:00+00', true),
  ('pm-eco-fed-cuts', 'Quantos cortes de juros o Fed faz em 2026?', 'economia', 'live', '2026-12-31 23:59:00+00', true)
on conflict (id) do nothing;

insert into public.market_outcomes (market_id, slug, label, sort_order) values
  ('pm-pol-brazil-mayor-sp', 'inc', 'Incumbent', 1), ('pm-pol-brazil-mayor-sp', 'ch1', 'Desafiante A', 2),
  ('pm-pol-brazil-mayor-sp', 'ch2', 'Desafiante B', 3),
  ('pm-pol-us-midterms', 'dem', 'Democratas', 1), ('pm-pol-us-midterms', 'rep', 'Republicanos', 2),
  ('pm-pol-uk-election', 'lab', 'Labour', 1), ('pm-pol-uk-election', 'con', 'Conservadores', 2),
  ('pm-pol-uk-election', 'ld', 'Lib Dems', 3),
  ('pm-pol-france-president', 'macron', 'Centro/Macronista', 1),
  ('pm-pol-france-president', 'rn', 'Extrema-direita', 2), ('pm-pol-france-president', 'left', 'Esquerda unida', 3),
  ('pm-crypto-eth-june', '4k', 'Acima de US$ 4k', 1), ('pm-crypto-eth-june', '3k', 'US$ 3k–4k', 2),
  ('pm-crypto-eth-june', '2k', 'Abaixo de US$ 3k', 3),
  ('pm-crypto-sol-ath', 'yes', 'Sim', 1), ('pm-crypto-sol-ath', 'no', 'Não', 2),
  ('pm-crypto-etf-flows', 'yes', 'Sim', 1), ('pm-crypto-etf-flows', 'no', 'Não', 2),
  ('pm-crypto-stable-reg', 'yes', 'Sim', 1), ('pm-crypto-stable-reg', 'no', 'Não', 2),
  ('pm-tech-apple-ai', 'yes', 'Sim', 1), ('pm-tech-apple-ai', 'no', 'Não', 2),
  ('pm-tech-spacex-starship', 'yes', 'Sim', 1), ('pm-tech-spacex-starship', 'no', 'Não', 2),
  ('pm-tech-nvidia-4t', 'yes', 'Sim', 1), ('pm-tech-nvidia-4t', 'no', 'Não', 2),
  ('pm-tech-open-source-llm', 'llama', 'Meta Llama', 1), ('pm-tech-open-source-llm', 'mistral', 'Mistral', 2),
  ('pm-tech-open-source-llm', 'qwen', 'Qwen', 3),
  ('pm-cult-oscar-best', 'a', 'Filme A', 1), ('pm-cult-oscar-best', 'b', 'Filme B', 2),
  ('pm-cult-oscar-best', 'c', 'Filme C', 3),
  ('pm-cult-bbb26', 'fav1', 'Favorito A', 1), ('pm-cult-bbb26', 'fav2', 'Favorito B', 2),
  ('pm-cult-bbb26', 'fav3', 'Favorito C', 3), ('pm-cult-bbb26', 'out', 'Outro', 4),
  ('pm-cult-taylor-tour', 'yes', 'Sim', 1), ('pm-cult-taylor-tour', 'no', 'Não', 2),
  ('pm-cult-streaming-war', 'netflix', 'Netflix', 1), ('pm-cult-streaming-war', 'disney', 'Disney+', 2),
  ('pm-cult-streaming-war', 'prime', 'Prime Video', 3),
  ('pm-eco-selic-dec', '10', '10% ou menos', 1), ('pm-eco-selic-dec', '11', '11%', 2),
  ('pm-eco-selic-dec', '12', '12% ou mais', 3),
  ('pm-eco-ipca-june', 'yes', 'Sim', 1), ('pm-eco-ipca-june', 'no', 'Não', 2),
  ('pm-eco-us-recession', 'yes', 'Sim', 1), ('pm-eco-us-recession', 'no', 'Não', 2),
  ('pm-eco-brl-usd', 'yes', 'Sim', 1), ('pm-eco-brl-usd', 'no', 'Não', 2),
  ('pm-eco-fed-cuts', '0', '0 cortes', 1), ('pm-eco-fed-cuts', '1-2', '1–2 cortes', 2),
  ('pm-eco-fed-cuts', '3+', '3+ cortes', 3)
on conflict (market_id, slug) do nothing;

insert into public.market_topic_assignments (market_id, source, topic_slug) values
  ('pm-pol-brazil-mayor-sp', 'prediction', 'eleicoes'),
  ('pm-pol-us-midterms', 'prediction', 'eleicoes'),
  ('pm-pol-uk-election', 'prediction', 'eleicoes'),
  ('pm-pol-france-president', 'prediction', 'eleicoes'),
  ('pm-crypto-eth-june', 'prediction', 'ethereum'),
  ('pm-crypto-sol-ath', 'prediction', 'up-down'),
  ('pm-crypto-etf-flows', 'prediction', 'bitcoin'),
  ('pm-crypto-stable-reg', 'prediction', 'up-down'),
  ('pm-tech-apple-ai', 'prediction', 'ia'),
  ('pm-tech-spacex-starship', 'prediction', 'spacex'),
  ('pm-tech-nvidia-4t', 'prediction', 'big-tech'),
  ('pm-tech-open-source-llm', 'prediction', 'ia'),
  ('pm-cult-oscar-best', 'prediction', 'entretenimento'),
  ('pm-cult-bbb26', 'prediction', 'entretenimento'),
  ('pm-cult-taylor-tour', 'prediction', 'entretenimento'),
  ('pm-cult-streaming-war', 'prediction', 'entretenimento'),
  ('pm-eco-selic-dec', 'prediction', 'selic'),
  ('pm-eco-ipca-june', 'prediction', 'inflacao'),
  ('pm-eco-us-recession', 'prediction', 'inflacao'),
  ('pm-eco-brl-usd', 'prediction', 'inflacao'),
  ('pm-eco-fed-cuts', 'prediction', 'selic')
on conflict do nothing;
