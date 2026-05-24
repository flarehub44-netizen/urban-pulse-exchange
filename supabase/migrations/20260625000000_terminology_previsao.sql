-- UI terminology: aposta → previsão / participação (user-facing copy only; IDs unchanged)

-- Achievements (retention_habits seed)
update public.achievements set
  name = 'Primeira previsão',
  description = 'Fez sua primeira previsão na cidade'
where id = 'first_bet';

update public.achievements set
  description = 'Movimentou R$ 10.000 em previsões'
where id = 'volume_10k';

-- Achievements (engagement_expansion seed)
update public.achievements set
  description = 'Retornou após 3+ dias ausente e fez uma previsão'
where id = 'comeback_3';

update public.achievements set
  name = 'Previsor iniciante',
  description = '10 previsões realizadas'
where id = 'bets_10';

update public.achievements set
  name = 'Trader urbano',
  description = '50 previsões realizadas'
where id = 'bets_50';

update public.achievements set
  name = 'Veterano da exchange',
  description = '200 previsões realizadas'
where id = 'bets_200';

update public.achievements set
  name = 'Maratonista urbano',
  description = '500 previsões realizadas'
where id = 'bets_500';

update public.achievements set
  description = 'R$ 50.000 movimentados em previsões'
where id = 'volume_50k';

update public.achievements set
  description = 'R$ 100.000 movimentados em previsões'
where id = 'volume_100k';

update public.achievements set
  description = 'R$ 500.000 movimentados em previsões'
where id = 'volume_500k';

update public.achievements set
  name = 'Trader de fim de semana',
  description = 'Fez uma previsão em um final de semana'
where id = 'weekend_bet';

update public.achievements set
  name = 'Coruja urbana',
  description = 'Fez uma previsão após meia-noite'
where id = 'midnight_bet';

update public.achievements set
  description = 'Fez uma previsão antes das 7h da manhã'
where id = 'morning_bet';

update public.achievements set
  name = 'Participação de alto risco',
  description = 'Fez uma previsão com participação acima de R$ 500'
where id = 'big_stake';

-- Daily missions
update public.daily_missions set
  description = 'Faça uma previsão em um mercado que fecha em menos de 2h'
where id = 'closing_soon';

update public.daily_missions set
  description = 'Faça uma previsão em um mercado na sua região'
where id = 'neighborhood';

update public.daily_missions set
  description = 'Preveja contra a previsão da IA em qualquer mercado'
where id = 'vs_ai';

update public.daily_missions set
  description = 'Faça uma previsão em um mercado de categoria Fluxo'
where id = 'fluxo_bet';

update public.daily_missions set
  description = 'Faça uma previsão em um mercado de categoria Velocidade'
where id = 'velocidade_bet';

update public.daily_missions set
  description = 'Faça uma previsão num mercado com pool acima de R$ 5.000'
where id = 'big_pool';

update public.daily_missions set
  description = 'Preveja no mesmo lado da UrbanMind (confidence >= 80%)'
where id = 'high_confidence';

update public.daily_missions set
  description = 'Faça uma previsão antes das 10h'
where id = 'morning_pulse';

update public.daily_missions set
  description = 'Faça uma previsão entre 17h e 19h'
where id = 'evening_rush';
