-- Engagement Expansion: 50+ achievements, streak multiplier, recovery grace,
-- trader archetype, UrbanMind memory expansion, market social proof,
-- daily missions rotation, weekly report RPC, buy_streak_freeze, preview tomorrow

-- ---------------------------------------------------------------------------
-- 1. ACHIEVEMENTS EXPANDIDOS (50+ conquistas)
-- ---------------------------------------------------------------------------

-- Adicionar campo icon e categoria
alter table public.achievements
  add column if not exists icon text not null default '🏅',
  add column if not exists category text not null default 'geral';

-- Streak & hábito
insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('streak_14',  'Fortuna Urbana',      '14 dias seguidos de check-in',               '🔥', 'habito', 10),
  ('streak_30',  'Pulso Constante',     '30 dias seguidos de check-in',               '💎', 'habito', 11),
  ('streak_60',  'Lenda da Cidade',     '60 dias seguidos de check-in',               '🌆', 'habito', 12),
  ('streak_100', 'Imortal Urbano',      '100 dias seguidos — você é a cidade',        '👑', 'habito', 13),
  ('first_week', 'Primeira Semana',     'Completou sua primeira semana na plataforma','📅', 'habito', 14),
  ('comeback_3', 'Voltou por Mais',     'Retornou após 3+ dias ausente e apostou',    '🔄', 'habito', 15)
on conflict (id) do nothing;

-- Mastery por categoria
insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('fluxo_5',         'Leitor de Fluxo',        '5 vitórias em mercados de Fluxo',         '🚗', 'maestria', 20),
  ('fluxo_10',        'Mestre do Fluxo',         '10 vitórias em mercados de Fluxo',        '🛣️', 'maestria', 21),
  ('fluxo_20',        'Expert em Fluxo',         '20 vitórias em mercados de Fluxo',        '🏎️', 'maestria', 22),
  ('velocidade_5',    'Sensor de Velocidade',    '5 vitórias em mercados de Velocidade',    '⚡', 'maestria', 23),
  ('velocidade_10',   'Analista de Velocidade',  '10 vitórias em mercados de Velocidade',   '🎯', 'maestria', 24),
  ('congest_5',       'Olho no Congestionamento','5 vitórias em mercados de Congestionamento','🚦', 'maestria', 25),
  ('congest_10',      'Guru do Trânsito',        '10 vitórias em mercados de Congestionamento','🗺️', 'maestria', 26),
  ('evento_5',        'Caçador de Eventos',      '5 vitórias em mercados de Evento',        '🎪', 'maestria', 27),
  ('evento_10',       'Analista de Eventos',     '10 vitórias em mercados de Evento',       '🔍', 'maestria', 28)
on conflict (id) do nothing;

-- Volume & trading
insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('bets_10',       'Apostador Iniciante',  '10 apostas realizadas',                '📊', 'volume', 30),
  ('bets_50',       'Trader Urbano',        '50 apostas realizadas',                '📈', 'volume', 31),
  ('bets_200',      'Veterano da Exchange', '200 apostas realizadas',               '🏆', 'volume', 32),
  ('bets_500',      'Maratonista Urbano',   '500 apostas realizadas',               '🌟', 'volume', 33),
  ('volume_50k',    'Meio Milhão',          'R$ 50.000 movimentados em apostas',    '💰', 'volume', 34),
  ('volume_100k',   'Centenário',           'R$ 100.000 movimentados em apostas',   '💎', 'volume', 35),
  ('volume_500k',   'Whale Urbano',         'R$ 500.000 movimentados em apostas',   '🐋', 'volume', 36)
on conflict (id) do nothing;

-- Competição & social
insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('wins_10',           'Decacampeão',          '10 vitórias em mercados resolvidos',       '🥇', 'competicao', 40),
  ('wins_25',           'Quarteto de Acertos',  '25 vitórias em mercados resolvidos',       '🎖️', 'competicao', 41),
  ('wins_50',           'Meia Centena',         '50 vitórias em mercados resolvidos',       '🏅', 'competicao', 42),
  ('vs_ai_10',          'Desafiador da IA',     '10 vitórias discordando da UrbanMind',     '🤖', 'competicao', 43),
  ('vs_ai_25',          'Alpha Deity',          '25 vitórias contra a UrbanMind',           '⚡', 'competicao', 44),
  ('legendary_contra',  'Lenda Contrarian',     'Discordou da IA 50x e venceu mais da metade','🦅', 'competicao', 45),
  ('first_post',        'Voz na Cidade',        'Publicou seu primeiro post no feed',        '📢', 'social', 50),
  ('first_follow',      'Conexão Feita',        'Seguiu seu primeiro trader',                '🤝', 'social', 51)
on conflict (id) do nothing;

-- Eventos especiais & timing
insert into public.achievements (id, name, description, icon, category, sort_order) values
  ('weekend_bet',    'Trader de Fim de Semana', 'Apostou em um final de semana',          '🌅', 'especial', 60),
  ('midnight_bet',   'Coruja Urbana',           'Apostou após meia-noite',                 '🦉', 'especial', 61),
  ('morning_bet',    'Madrugador',              'Apostou antes das 7h da manhã',           '☕', 'especial', 62),
  ('big_stake',      'Aposta de Alto Risco',    'Fez uma aposta acima de R$ 500',          '🎲', 'especial', 63),
  ('anniversary',    'Aniversário ViaX',        'Completou 1 ano na plataforma',           '🎂', 'especial', 64)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. STREAK MULTIPLIER — coluna na tabela + helper
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists streak_multiplier numeric(3,1) not null default 1.0,
  add column if not exists recovery_mode boolean not null default false,
  add column if not exists recovery_days_left int not null default 0;

create or replace function public.streak_xp_multiplier(p_streak int)
returns numeric
language sql
immutable
as $$
  select case
    when p_streak >= 30 then 3.0
    when p_streak >= 14 then 2.0
    when p_streak >= 7  then 1.5
    else 1.0
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. BUY STREAK FREEZE (gastar XP para comprar freeze)
-- ---------------------------------------------------------------------------
create or replace function public.buy_streak_freeze()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_xp int;
  v_cost int := 200;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select xp into v_xp from public.profiles where id = v_user_id for update;
  if v_xp < v_cost then
    return jsonb_build_object('ok', false, 'reason', 'not_enough_xp', 'cost', v_cost, 'xp', v_xp);
  end if;
  perform set_config('viax.progression', 'on', true);
  update public.profiles
  set xp = xp - v_cost,
      streak_freezes_left = streak_freezes_left + 1
  where id = v_user_id;
  perform set_config('viax.progression', 'off', true);
  return jsonb_build_object('ok', true, 'freezes_left', (select streak_freezes_left from public.profiles where id = v_user_id));
end;
$$;

grant execute on function public.buy_streak_freeze() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RECOVERY GRACE MODE — ao perder streak, 3 dias de XP 2x
-- ---------------------------------------------------------------------------
create or replace function public.activate_recovery_mode(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('viax.progression', 'on', true);
  update public.profiles
  set recovery_mode = true, recovery_days_left = 3
  where id = p_user_id;
  perform set_config('viax.progression', 'off', true);
  perform public.insert_user_notification(
    p_user_id, 'alert',
    'Modo Recuperação ativado! Seus próximos 3 check-ins valem XP em dobro. Reconquiste seu ritmo.',
    null
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. EXPANDED ACHIEVEMENTS CHECK — tudo num lugar só
-- ---------------------------------------------------------------------------
create or replace function public.check_user_achievements(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile      profiles%rowtype;
  v_wins         int;
  v_volume       numeric;
  v_vs_ai_wins   int;
  v_bets_vs_ai   int;
  v_total_bets   int;
  v_before       timestamptz := clock_timestamp();
  -- category wins
  v_wins_fluxo   int;
  v_wins_vel     int;
  v_wins_cong    int;
  v_wins_evento  int;
begin
  select * into v_profile from public.profiles where id = p_user_id;

  -- Total stats
  select
    count(*) filter (where payout > 0),
    coalesce(sum(stake), 0),
    count(*)
  into v_wins, v_volume, v_total_bets
  from public.bets where user_id = p_user_id;

  select coalesce(wins_vs_ai, 0) into v_vs_ai_wins
  from public.user_ai_memory where user_id = p_user_id;

  -- Category wins
  select count(*) filter (where b.payout > 0 and m.category = 'Fluxo')
  into v_wins_fluxo
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id;

  select count(*) filter (where b.payout > 0 and m.category = 'Velocidade')
  into v_wins_vel
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id;

  select count(*) filter (where b.payout > 0 and m.category = 'Congestionamento')
  into v_wins_cong
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id;

  select count(*) filter (where b.payout > 0 and m.category = 'Evento')
  into v_wins_evento
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id;

  -- Bets
  if v_total_bets >= 1  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'first_bet')    on conflict do nothing; end if;
  if v_total_bets >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'bets_10')      on conflict do nothing; end if;
  if v_total_bets >= 50 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'bets_50')      on conflict do nothing; end if;
  if v_total_bets >= 200 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'bets_200')    on conflict do nothing; end if;
  if v_total_bets >= 500 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'bets_500')    on conflict do nothing; end if;

  -- Wins
  if v_wins >= 1  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'first_win')   on conflict do nothing; end if;
  if v_wins >= 5  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'wins_5')      on conflict do nothing; end if;
  if v_wins >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'wins_10')     on conflict do nothing; end if;
  if v_wins >= 25 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'wins_25')     on conflict do nothing; end if;
  if v_wins >= 50 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'wins_50')     on conflict do nothing; end if;

  -- Streaks
  if v_profile.streak >= 3   then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_3')   on conflict do nothing; end if;
  if v_profile.streak >= 7   then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_7')   on conflict do nothing; end if;
  if v_profile.streak >= 14  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_14')  on conflict do nothing; end if;
  if v_profile.streak >= 30  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_30')  on conflict do nothing; end if;
  if v_profile.streak >= 60  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_60')  on conflict do nothing; end if;
  if v_profile.streak >= 100 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_100') on conflict do nothing; end if;

  -- vs AI
  if v_vs_ai_wins >= 3  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'vs_ai_3')          on conflict do nothing; end if;
  if v_vs_ai_wins >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'vs_ai_10')         on conflict do nothing; end if;
  if v_vs_ai_wins >= 25 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'vs_ai_25')         on conflict do nothing; end if;

  -- Contrarian lenda
  select coalesce(bets_vs_ai, 0) into v_bets_vs_ai from public.user_ai_memory where user_id = p_user_id;
  if v_bets_vs_ai >= 50 and v_vs_ai_wins::numeric / nullif(v_bets_vs_ai, 0) >= 0.5 then
    insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'legendary_contra') on conflict do nothing;
  end if;

  -- Volume
  if v_volume >= 10000  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'volume_10k')  on conflict do nothing; end if;
  if v_volume >= 50000  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'volume_50k')  on conflict do nothing; end if;
  if v_volume >= 100000 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'volume_100k') on conflict do nothing; end if;
  if v_volume >= 500000 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'volume_500k') on conflict do nothing; end if;

  -- Category mastery
  if v_wins_fluxo >= 5  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'fluxo_5')    on conflict do nothing; end if;
  if v_wins_fluxo >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'fluxo_10')   on conflict do nothing; end if;
  if v_wins_fluxo >= 20 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'fluxo_20')   on conflict do nothing; end if;
  if v_wins_vel   >= 5  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'velocidade_5')  on conflict do nothing; end if;
  if v_wins_vel   >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'velocidade_10') on conflict do nothing; end if;
  if v_wins_cong  >= 5  then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'congest_5')   on conflict do nothing; end if;
  if v_wins_cong  >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'congest_10')  on conflict do nothing; end if;
  if v_wins_evento >= 5 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'evento_5')   on conflict do nothing; end if;
  if v_wins_evento >= 10 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'evento_10') on conflict do nothing; end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'description', a.description, 'icon', a.icon
    )), '[]'::jsonb)
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p_user_id and ua.unlocked_at >= v_before
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. STREAK MULTIPLIER NO DAILY CHECK-IN
-- ---------------------------------------------------------------------------
create or replace function public.daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid := auth.uid();
  v_profile    profiles%rowtype;
  v_today      date := (timezone('America/Sao_Paulo', now()))::date;
  v_yesterday  date := v_today - 1;
  v_new_streak int;
  v_insight    text;
  v_region     text;
  v_base_xp   int := 100;
  v_xp         int;
  v_multiplier numeric;
  v_progress   jsonb;
  v_lost_streak boolean := false;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  if exists (
    select 1 from public.daily_check_ins
    where user_id = v_user_id and check_in_date = v_today
  ) then
    return jsonb_build_object('already_checked_in', true);
  end if;

  perform set_config('viax.progression', 'on', true);
  select * into v_profile from public.profiles where id = v_user_id for update;

  if v_profile.last_check_in_date = v_yesterday then
    v_new_streak := v_profile.streak + 1;
  elsif v_profile.last_check_in_date = v_today then
    v_new_streak := v_profile.streak;
  else
    -- Perdeu o streak — ativar modo recuperação se tinha streak >= 3
    if v_profile.streak >= 3 then
      v_lost_streak := true;
    end if;
    v_new_streak := 1;
  end if;

  -- Calcular multiplicador de XP
  v_multiplier := public.streak_xp_multiplier(v_new_streak);

  -- Recovery mode: 2x XP
  if v_profile.recovery_mode and v_profile.recovery_days_left > 0 then
    v_multiplier := v_multiplier * 2.0;
    update public.profiles
    set recovery_days_left = greatest(0, recovery_days_left - 1),
        recovery_mode = (recovery_days_left - 1 > 0)
    where id = v_user_id;
  end if;

  v_xp := round(v_base_xp * v_multiplier)::int;

  v_region := nullif(trim(v_profile.neighborhood), '');
  if v_region is null then v_region := v_profile.city; end if;

  v_insight := case
    when v_new_streak >= 30 then 'Mês inteiro de pulso urbano! Você é parte da cidade agora. XP ' || v_multiplier::text || 'x.'
    when v_new_streak >= 14 then '2 semanas seguidas! Multiplicador ' || v_multiplier::text || 'x ativo — continue assim.'
    when v_new_streak >= 7  then 'Semana completa — você está lendo a cidade como poucos. XP ' || v_multiplier::text || 'x!'
    when v_new_streak >= 3  then 'Rotina formada em ' || coalesce(v_region, 'São Paulo') || '. Confira um mercado ao vivo hoje.'
    else 'Bom dia, analista. O mapa ao vivo já está atualizando regiões de ' || coalesce(v_region, 'São Paulo') || '.'
  end;

  update public.profiles
  set streak = v_new_streak,
      streak_multiplier = v_multiplier,
      last_check_in_date = v_today,
      last_active_at = now()
  where id = v_user_id;

  insert into public.daily_check_ins (user_id, check_in_date, xp_awarded, insight)
  values (v_user_id, v_today, v_xp, v_insight);

  perform set_config('viax.progression', 'off', true);

  v_progress := public.apply_user_progress(v_user_id, 'check_in', v_xp);

  -- Ativar recovery mode se perdeu streak
  if v_lost_streak then
    perform public.activate_recovery_mode(v_user_id);
  end if;

  return jsonb_build_object(
    'streak', v_new_streak,
    'xp_awarded', v_xp,
    'xp_multiplier', v_multiplier,
    'insight', v_insight,
    'progress', v_progress,
    'recovery_mode', v_profile.recovery_mode
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. TRADER ARCHETYPE — calculado on-demand
-- ---------------------------------------------------------------------------
create or replace function public.get_trader_archetype(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile      profiles%rowtype;
  v_mem          user_ai_memory%rowtype;
  v_total_bets   int;
  v_bets_vs_ai   int;
  v_wins_vs_ai   int;
  v_wins         int;
  v_region_top   text;
  v_hour_mode    int;
  v_max_stake    numeric;
  v_accuracy     numeric;
  v_archetype    text;
  v_archetype_en text;
  v_desc         text;
  v_icon         text;
begin
  if p_user_id is null then return '{}'::jsonb; end if;
  select * into v_profile from public.profiles where id = p_user_id;
  select * into v_mem from public.user_ai_memory where user_id = p_user_id;

  select count(*), count(*) filter (where payout > 0)
  into v_total_bets, v_wins
  from public.bets where user_id = p_user_id;

  v_bets_vs_ai := coalesce(v_mem.bets_vs_ai, 0);
  v_wins_vs_ai := coalesce(v_mem.wins_vs_ai, 0);
  v_accuracy   := v_profile.accuracy;

  -- Top região
  select m.region into v_region_top
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
  group by m.region order by count(*) desc limit 1;

  -- Hora modal de apostas
  select extract(hour from b.created_at at time zone 'America/Sao_Paulo')::int into v_hour_mode
  from public.bets b where b.user_id = p_user_id
  group by 1 order by count(*) desc limit 1;

  -- Maior aposta
  select max(stake) into v_max_stake from public.bets where user_id = p_user_id;

  -- Determinar arquétipo (prioridade top-down)
  if v_total_bets > 0 and v_bets_vs_ai::numeric / v_total_bets > 0.6 and v_wins_vs_ai::numeric / nullif(v_bets_vs_ai, 0) > 0.5 then
    v_archetype    := 'O Contrarian';
    v_archetype_en := 'contrarian';
    v_desc         := 'Você confia no seu instinto quando a IA erra. E quase sempre acerta.';
    v_icon         := '🦅';
  elsif v_accuracy > 0.65 and v_wins > 5 then
    v_archetype    := 'O Analista Urbano';
    v_archetype_en := 'analyst';
    v_desc         := 'Precisão é sua marca. Você lê padrões onde outros veem caos.';
    v_icon         := '🔬';
  elsif v_max_stake >= 300 then
    v_archetype    := 'O Caçador de Jackpot';
    v_archetype_en := 'jackpot_hunter';
    v_desc         := 'Você vai grande quando tem convicção. Alto risco, alta recompensa.';
    v_icon         := '🎲';
  elsif coalesce(v_hour_mode, 12) between 17 and 19 then
    v_archetype    := 'O Rush Hour Trader';
    v_archetype_en := 'rush_hour';
    v_desc         := 'Você vive para o horário de pico. A cidade no caos é seu playground.';
    v_icon         := '🚦';
  elsif coalesce(v_hour_mode, 12) < 8 then
    v_archetype    := 'O Madrugador';
    v_archetype_en := 'early_bird';
    v_desc         := 'Você lê a cidade antes de ela acordar. Vantagem de quem não dorme.';
    v_icon         := '☀️';
  elsif v_region_top is not null then
    v_archetype    := 'O Especialista de Bairro';
    v_archetype_en := 'neighborhood_expert';
    v_desc         := 'Você conhece ' || coalesce(v_region_top, 'sua região') || ' melhor do que qualquer IA.';
    v_icon         := '📍';
  else
    v_archetype    := 'O Explorador Urbano';
    v_archetype_en := 'explorer';
    v_desc         := 'Você está construindo seu estilo. A cidade é seu laboratório.';
    v_icon         := '🗺️';
  end if;

  return jsonb_build_object(
    'archetype',    v_archetype,
    'archetype_en', v_archetype_en,
    'description',  v_desc,
    'icon',         v_icon,
    'top_region',   v_region_top,
    'peak_hour',    v_hour_mode,
    'accuracy',     round(v_accuracy * 100, 1),
    'total_bets',   v_total_bets
  );
end;
$$;

grant execute on function public.get_trader_archetype(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. MARKET VIEWS (social proof)
-- ---------------------------------------------------------------------------
create table if not exists public.market_views (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  market_id text not null references public.markets(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, market_id)
);

alter table public.market_views enable row level security;
create policy "market_views_own_insert" on public.market_views for insert
  with check (auth.uid() = user_id);
create policy "market_views_select_all" on public.market_views for select
  using (true);

create or replace function public.record_market_view(p_market_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.market_views (user_id, market_id, viewed_at)
  values (auth.uid(), p_market_id, now())
  on conflict (user_id, market_id) do update set viewed_at = now();
end;
$$;

create or replace function public.get_market_social_proof(p_market_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_viewers    int;
  v_recent_bets jsonb;
  v_momentum   int;
begin
  -- Viewers únicos últimas 4h
  select count(distinct user_id) into v_viewers
  from public.market_views
  where market_id = p_market_id and viewed_at >= now() - interval '4 hours';

  -- Apostas recentes (últimas 10 min) para momentum
  select count(*) into v_momentum
  from public.bets
  where market_id = p_market_id and created_at >= now() - interval '10 minutes';

  -- Últimas 5 apostas com nome do trader (anonimizado se necessário)
  select coalesce(jsonb_agg(row_order order by row_order.created_at desc), '[]'::jsonb) into v_recent_bets
  from (
    select
      p.name,
      p.handle,
      b.side,
      b.stake,
      b.created_at,
      row_number() over (order by b.created_at desc) as rn
    from public.bets b
    join public.profiles p on p.id = b.user_id
    where b.market_id = p_market_id
    order by b.created_at desc
    limit 5
  ) row_order;

  return jsonb_build_object(
    'viewers',      coalesce(v_viewers, 0),
    'momentum',     coalesce(v_momentum, 0),
    'recent_bets',  v_recent_bets
  );
end;
$$;

grant execute on function public.record_market_view(text) to authenticated;
grant execute on function public.get_market_social_proof(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. DAILY MISSIONS SYSTEM (3 missões por dia, rotação diária)
-- ---------------------------------------------------------------------------
create table if not exists public.daily_missions (
  id          text primary key,
  label       text not null,
  description text not null,
  xp_reward   int  not null default 75,
  kind        text not null, -- 'closing_soon', 'neighborhood', 'vs_ai', 'category', 'any_bet'
  icon        text not null default '🎯'
);

insert into public.daily_missions (id, label, description, xp_reward, kind, icon) values
  ('closing_soon',   'Contra o Relógio',          'Aposte em um mercado que fecha em menos de 2h',    75,  'closing_soon',  '⏱️'),
  ('neighborhood',   'Meu Bairro em Destaque',    'Aposte em um mercado na sua região',               50,  'neighborhood',  '📍'),
  ('vs_ai',          'Desafie a UrbanMind',        'Aposte contra a previsão da IA em qualquer mercado',100,'vs_ai',         '🤖'),
  ('fluxo_bet',      'Analista de Fluxo',          'Aposte em um mercado de categoria Fluxo',          60,  'category_fluxo','🚗'),
  ('velocidade_bet', 'Sensor de Velocidade',       'Aposte em um mercado de categoria Velocidade',     60,  'category_vel',  '⚡'),
  ('big_pool',       'Mercado de Alto Volume',     'Aposte num mercado com pool acima de R$ 5.000',    80,  'big_pool',      '💰'),
  ('high_confidence','Confie na IA',               'Aposte no mesmo lado da UrbanMind (confidence >= 80%)',65,'follow_ai',   '🎯'),
  ('morning_pulse',  'Pulso da Manhã',             'Aposte antes das 10h',                             90,  'time_morning',  '☀️'),
  ('evening_rush',   'Hora do Pico',               'Aposte entre 17h e 19h',                           90,  'time_evening',  '🚦')
on conflict (id) do nothing;

create table if not exists public.user_mission_progress (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  mission_id text not null references public.daily_missions(id) on delete cascade,
  date       date not null default (timezone('America/Sao_Paulo', now()))::date,
  completed  boolean not null default false,
  completed_at timestamptz,
  primary key (user_id, mission_id, date)
);

alter table public.user_mission_progress enable row level security;
create policy "user_mission_progress_own" on public.user_mission_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.get_daily_missions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_today    date := (timezone('America/Sao_Paulo', now()))::date;
  v_day_seed int;
  v_ids      text[];
begin
  if v_user_id is null then return '[]'::jsonb; end if;

  -- Seed determinístico por dia (todos veem as mesmas 3 missões no mesmo dia)
  v_day_seed := extract(doy from v_today)::int + extract(year from v_today)::int * 365;

  -- Selecionar 3 missões baseado no seed do dia
  select array_agg(id order by (id::text || v_day_seed::text) ) into v_ids
  from (
    select id from public.daily_missions
    order by md5(id || v_day_seed::text)
    limit 3
  ) s;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',           dm.id,
      'label',        dm.label,
      'description',  dm.description,
      'xp_reward',    dm.xp_reward,
      'icon',         dm.icon,
      'kind',         dm.kind,
      'completed',    coalesce(ump.completed, false),
      'completed_at', ump.completed_at
    )), '[]'::jsonb)
    from public.daily_missions dm
    left join public.user_mission_progress ump
      on ump.mission_id = dm.id and ump.user_id = v_user_id and ump.date = v_today
    where dm.id = any(v_ids)
  );
end;
$$;

grant execute on function public.get_daily_missions() to authenticated;

create or replace function public.complete_mission(p_mission_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_today    date := (timezone('America/Sao_Paulo', now()))::date;
  v_xp       int;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select xp_reward into v_xp from public.daily_missions where id = p_mission_id;
  if not found then raise exception 'Mission not found'; end if;

  insert into public.user_mission_progress (user_id, mission_id, date, completed, completed_at)
  values (v_user_id, p_mission_id, v_today, true, now())
  on conflict (user_id, mission_id, date) do update set completed = true, completed_at = now()
  where not user_mission_progress.completed;

  if found then
    return public.apply_user_progress(v_user_id, 'mission_complete', v_xp);
  end if;
  return jsonb_build_object('already_done', true);
end;
$$;

grant execute on function public.complete_mission(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 10. WEEKLY PULSE REPORT RPC
-- ---------------------------------------------------------------------------
create or replace function public.get_weekly_pulse_report()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_profile     profiles%rowtype;
  v_week_start  timestamptz := date_trunc('week', now() - interval '7 days');
  v_week_end    timestamptz := date_trunc('week', now());
  v_bets_week   int;
  v_wins_week   int;
  v_pnl_week    numeric;
  v_best_region text;
  v_xp_week     int;
  v_rank_pct    numeric;
  v_prev_division division_tier;
begin
  if v_user_id is null then return '{}'::jsonb; end if;
  select * into v_profile from public.profiles where id = v_user_id;

  select count(*), count(*) filter (where payout > 0),
         coalesce(sum(coalesce(payout, 0) - stake), 0)
  into v_bets_week, v_wins_week, v_pnl_week
  from public.bets
  where user_id = v_user_id and created_at between v_week_start and v_week_end;

  -- Melhor região da semana
  select m.region into v_best_region
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = v_user_id and b.payout > 0
    and b.created_at between v_week_start and v_week_end
  group by m.region order by count(*) desc limit 1;

  -- XP ganho na semana (estimativa simples: check-ins * 100 + wins * 200)
  v_xp_week := v_wins_week * 200 + (v_bets_week - v_wins_week) * 25;

  -- % de traders com accuracy menor (ranking percentil)
  select round(100.0 * count(*) filter (where accuracy < v_profile.accuracy) / nullif(count(*), 0), 0)
  into v_rank_pct
  from public.profiles where is_ai = false;

  return jsonb_build_object(
    'bets_week',    v_bets_week,
    'wins_week',    v_wins_week,
    'pnl_week',     v_pnl_week,
    'best_region',  v_best_region,
    'xp_week',      v_xp_week,
    'streak',       v_profile.streak,
    'division',     v_profile.division,
    'accuracy',     round(v_profile.accuracy * 100, 1),
    'rank_pct',     coalesce(v_rank_pct, 50),
    'report_week',  to_char(v_week_start, 'DD/MM') || ' – ' || to_char(v_week_end, 'DD/MM')
  );
end;
$$;

grant execute on function public.get_weekly_pulse_report() to authenticated;

-- ---------------------------------------------------------------------------
-- 11. UrbanMind MEMORY EXPANDIDA
-- ---------------------------------------------------------------------------
alter table public.user_ai_memory
  add column if not exists favorite_region text,
  add column if not exists best_accuracy_region text,
  add column if not exists worst_accuracy_region text,
  add column if not exists favorite_category text,
  add column if not exists avg_stake numeric,
  add column if not exists archetype_en text;

-- Função para refresh da memória da IA (chamada após settle)
create or replace function public.refresh_user_ai_memory(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fav_region     text;
  v_best_region    text;
  v_worst_region   text;
  v_fav_category   text;
  v_avg_stake      numeric;
begin
  -- Região favorita (mais apostas)
  select m.region into v_fav_region
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
  group by m.region order by count(*) desc limit 1;

  -- Melhor região (maior % de acerto com >= 3 apostas)
  select m.region into v_best_region
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
  group by m.region
  having count(*) >= 3
  order by count(*) filter (where b.payout > 0)::numeric / count(*) desc
  limit 1;

  -- Pior região
  select m.region into v_worst_region
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
  group by m.region
  having count(*) >= 3
  order by count(*) filter (where b.payout > 0)::numeric / count(*) asc
  limit 1;

  -- Categoria favorita
  select m.category into v_fav_category
  from public.bets b join public.markets m on m.id = b.market_id
  where b.user_id = p_user_id
  group by m.category order by count(*) desc limit 1;

  -- Stake médio
  select avg(stake) into v_avg_stake from public.bets where user_id = p_user_id;

  insert into public.user_ai_memory (user_id, favorite_region, best_accuracy_region, worst_accuracy_region, favorite_category, avg_stake, updated_at)
  values (p_user_id, v_fav_region, v_best_region, v_worst_region, v_fav_category, v_avg_stake, now())
  on conflict (user_id) do update set
    favorite_region        = coalesce(v_fav_region, user_ai_memory.favorite_region),
    best_accuracy_region   = coalesce(v_best_region, user_ai_memory.best_accuracy_region),
    worst_accuracy_region  = coalesce(v_worst_region, user_ai_memory.worst_accuracy_region),
    favorite_category      = coalesce(v_fav_category, user_ai_memory.favorite_category),
    avg_stake              = coalesce(v_avg_stake, user_ai_memory.avg_stake),
    updated_at             = now();
end;
$$;

-- Chamar refresh após cada aposta resolvida (estender trigger existente)
create or replace function public.trg_bets_on_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market     markets%rowtype;
  v_won_vs_ai  boolean;
begin
  if old.payout is not null or new.payout is null then return new; end if;

  select * into v_market from public.markets where id = new.market_id;

  if new.payout > 0 then
    perform public.apply_user_progress(new.user_id, 'bet_won', 200);
    v_won_vs_ai := new.side is distinct from v_market.ai_side and new.payout > 0;
    if v_won_vs_ai then
      update public.user_ai_memory
      set wins_vs_ai = wins_vs_ai + 1, updated_at = now()
      where user_id = new.user_id;
    end if;
  else
    perform public.apply_user_progress(new.user_id, 'bet_lost', 25);
  end if;

  -- Refresh AI memory periodicamente
  perform public.refresh_user_ai_memory(new.user_id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. GET URBANMIND DIGEST EXPANDIDO — memória real
-- ---------------------------------------------------------------------------
create or replace function public.get_urbanmind_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id     uuid := auth.uid();
  v_profile     profiles%rowtype;
  v_mem         user_ai_memory%rowtype;
  v_archetype   jsonb;
  v_market      markets%rowtype;
  v_rate        numeric;
  v_line        text;
  v_name        text;
begin
  if v_user_id is null then return '{}'::jsonb; end if;
  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_mem from public.user_ai_memory where user_id = v_user_id;

  v_name := split_part(v_profile.name, ' ', 1);

  if v_mem.bets_vs_ai > 0 then
    v_rate := round((v_mem.wins_vs_ai::numeric / v_mem.bets_vs_ai) * 100, 0);
  end if;

  if v_mem.last_market_id is not null then
    select * into v_market from public.markets where id = v_mem.last_market_id;
  end if;

  -- Copy personalizado por memória real
  v_line := case
    when v_mem.best_accuracy_region is not null and v_rate >= 60 then
      v_name || ', sua acurácia em ' || v_mem.best_accuracy_region || ' é excepcional. Tem mercado aberto lá agora.'
    when v_mem.worst_accuracy_region is not null and v_mem.total_bets > 10 then
      'Dica: ' || v_name || ' evite mercados em ' || v_mem.worst_accuracy_region || ' por enquanto — acurácia baixa lá. Foque em ' || coalesce(v_mem.best_accuracy_region, 'sua região forte') || '.'
    when v_rate >= 50 then
      'Quando você discorda da UrbanMind, acerta ' || v_rate::text || '% das vezes. Use isso no próximo mercado.'
    when v_mem.favorite_category is not null then
      'Sua categoria mais forte é ' || v_mem.favorite_category || '. A IA sugere olhar mercados desta categoria hoje.'
    when v_mem.total_bets > 0 then
      v_name || ', você já fez ' || v_mem.total_bets::text || ' palpites. Hoje a IA recomenda mercados de ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city) || '.'
    else
      'Comece com um mercado ao vivo na sua região — a UrbanMind mostra onde a cidade e você divergem.'
  end;

  return jsonb_build_object(
    'headline',              'Pulso UrbanMind · ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city),
    'body',                  v_line,
    'wins_vs_ai',            coalesce(v_mem.wins_vs_ai, 0),
    'bets_vs_ai',            coalesce(v_mem.bets_vs_ai, 0),
    'last_market_id',        v_mem.last_market_id,
    'last_side',             v_mem.last_side,
    'favorite_region',       v_mem.favorite_region,
    'best_accuracy_region',  v_mem.best_accuracy_region,
    'worst_accuracy_region', v_mem.worst_accuracy_region,
    'favorite_category',     v_mem.favorite_category,
    'avg_stake',             v_mem.avg_stake
  );
end;
$$;

-- Grants finais
grant execute on function public.get_daily_missions() to authenticated;
grant execute on function public.complete_mission(text) to authenticated;
grant execute on function public.get_weekly_pulse_report() to authenticated;
grant execute on function public.record_market_view(text) to authenticated;
grant execute on function public.get_market_social_proof(text) to authenticated;
grant execute on function public.buy_streak_freeze() to authenticated;
grant execute on function public.get_trader_archetype(uuid) to authenticated;
