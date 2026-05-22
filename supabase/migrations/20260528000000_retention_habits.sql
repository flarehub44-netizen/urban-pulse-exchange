-- Retention & habits: progression, check-ins, achievements, UrbanMind memory, notification prefs

-- ---------------------------------------------------------------------------
-- Profile columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists last_check_in_date date,
  add column if not exists email_bonus_claimed boolean not null default false,
  add column if not exists streak_freezes_left int not null default 1,
  add column if not exists last_active_at timestamptz;

-- ---------------------------------------------------------------------------
-- Daily check-ins
-- ---------------------------------------------------------------------------
create table if not exists public.daily_check_ins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_in_date date not null default (timezone('utc', now()))::date,
  xp_awarded int not null default 0,
  insight text,
  created_at timestamptz not null default now(),
  primary key (user_id, check_in_date)
);

alter table public.daily_check_ins enable row level security;
create policy "daily_check_ins_own" on public.daily_check_ins for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  sort_order int not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
create policy "user_achievements_own" on public.user_achievements for select
  using (auth.uid() = user_id);

insert into public.achievements (id, name, description, sort_order) values
  ('first_bet', 'Primeiro palpite', 'Fez sua primeira aposta na cidade', 1),
  ('first_win', 'Primeira vitória', 'Ganhou seu primeiro mercado resolvido', 2),
  ('streak_3', 'Rotina urbana', '3 dias seguidos de check-in', 3),
  ('streak_7', 'Maratonista', '7 dias seguidos de check-in', 4),
  ('wins_5', 'Quinto acerto', '5 vitórias em mercados resolvidos', 5),
  ('vs_ai_3', 'Alpha Predictor', '3 vitórias discordando da UrbanMind', 6),
  ('volume_10k', 'Volume Beast', 'Movimentou R$ 10.000 em apostas', 7)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- UrbanMind user memory
-- ---------------------------------------------------------------------------
create table if not exists public.user_ai_memory (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_bets int not null default 0,
  wins_vs_ai int not null default 0,
  bets_vs_ai int not null default 0,
  last_market_id text,
  last_side bet_side,
  updated_at timestamptz not null default now()
);

alter table public.user_ai_memory enable row level security;
create policy "user_ai_memory_own" on public.user_ai_memory for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Guard: allow progression RPCs to update gamification columns
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role', true) in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if current_setting('viax.progression', true) = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Cannot modify is_admin';
    end if;
    if new.balance is distinct from old.balance then
      raise exception 'Cannot modify balance directly; use platform RPCs';
    end if;
    if new.xp is distinct from old.xp
       or new.xp_to_next is distinct from old.xp_to_next
       or new.volume_24h is distinct from old.volume_24h
       or new.accuracy is distinct from old.accuracy
       or new.roi is distinct from old.roi
       or new.pnl is distinct from old.pnl
       or new.streak is distinct from old.streak
       or new.division is distinct from old.division then
      raise exception 'Cannot modify gamification stats directly';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification prefs helper
-- ---------------------------------------------------------------------------
create or replace function public.should_send_notification(
  p_user_id uuid,
  p_kind notif_kind
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_prefs jsonb;
begin
  select notification_prefs into v_prefs from public.profiles where id = p_user_id;
  if v_prefs is null then
    return true;
  end if;
  case p_kind
    when 'win' then return coalesce((v_prefs->>'wins')::boolean, true);
    when 'market' then return coalesce((v_prefs->>'markets')::boolean, true);
    when 'rank' then return coalesce((v_prefs->>'ranking')::boolean, false);
    when 'alert' then return coalesce((v_prefs->>'alerts')::boolean, true);
    else return true;
  end case;
end;
$$;

create or replace function public.insert_user_notification(
  p_user_id uuid,
  p_kind notif_kind,
  p_text text,
  p_market_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.should_send_notification(p_user_id, p_kind) then
    return;
  end if;
  insert into public.notifications (user_id, kind, text, market_id)
  values (p_user_id, p_kind, p_text, p_market_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Division from XP
-- ---------------------------------------------------------------------------
create or replace function public.division_for_xp(p_xp int)
returns division_tier
language sql
immutable
as $$
  select case
    when p_xp >= 15000 then 'Elite'::division_tier
    when p_xp >= 10000 then 'Diamante'::division_tier
    when p_xp >= 6000 then 'Platina'::division_tier
    when p_xp >= 3000 then 'Ouro'::division_tier
    when p_xp >= 1000 then 'Prata'::division_tier
    else 'Bronze'::division_tier
  end;
$$;

-- ---------------------------------------------------------------------------
-- Achievement unlock check (returns newly unlocked in this call)
-- ---------------------------------------------------------------------------
create or replace function public.check_user_achievements(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_wins int;
  v_volume numeric;
  v_vs_ai_wins int;
  v_before timestamptz := clock_timestamp();
begin
  select * into v_profile from public.profiles where id = p_user_id;
  select count(*) filter (where payout > 0), coalesce(sum(stake), 0)
  into v_wins, v_volume from public.bets where user_id = p_user_id;
  select coalesce(wins_vs_ai, 0) into v_vs_ai_wins from public.user_ai_memory where user_id = p_user_id;

  if exists (select 1 from public.bets where user_id = p_user_id) then
    insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'first_bet') on conflict do nothing;
  end if;
  if v_wins >= 1 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'first_win') on conflict do nothing; end if;
  if v_profile.streak >= 3 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_3') on conflict do nothing; end if;
  if v_profile.streak >= 7 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'streak_7') on conflict do nothing; end if;
  if v_wins >= 5 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'wins_5') on conflict do nothing; end if;
  if v_vs_ai_wins >= 3 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'vs_ai_3') on conflict do nothing; end if;
  if v_volume >= 10000 then insert into public.user_achievements (user_id, achievement_id) values (p_user_id, 'volume_10k') on conflict do nothing; end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'name', a.name, 'description', a.description
    )), '[]'::jsonb)
    from public.user_achievements ua
    join public.achievements a on a.id = ua.achievement_id
    where ua.user_id = p_user_id and ua.unlocked_at >= v_before
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_user_progress
-- ---------------------------------------------------------------------------
create or replace function public.apply_user_progress(
  p_user_id uuid,
  p_event text,
  p_xp_delta int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile profiles%rowtype;
  v_new_xp int;
  v_new_division division_tier;
  v_achievements jsonb;
begin
  perform set_config('viax.progression', 'on', true);

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    return '{}'::jsonb;
  end if;

  v_new_xp := v_profile.xp + p_xp_delta;

  update public.profiles
  set
    xp = v_new_xp,
    division = public.division_for_xp(v_new_xp),
    xp_to_next = case
      when public.division_for_xp(v_new_xp) = 'Elite' then 0
      else greatest(500, (floor(v_new_xp / 1000) + 1) * 1000 - v_new_xp)
    end,
    last_active_at = now()
  where id = p_user_id;

  v_achievements := public.check_user_achievements(p_user_id);

  perform set_config('viax.progression', 'off', true);

  return jsonb_build_object(
    'xp', v_new_xp,
    'xp_delta', p_xp_delta,
    'event', p_event,
    'achievements_unlocked', v_achievements
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- daily_check_in
-- ---------------------------------------------------------------------------
create or replace function public.daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_today date := (timezone('America/Sao_Paulo', now()))::date;
  v_yesterday date := v_today - 1;
  v_new_streak int;
  v_insight text;
  v_region text;
  v_xp int := 100;
  v_progress jsonb;
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
    v_new_streak := 1;
  end if;

  v_region := nullif(trim(v_profile.neighborhood), '');
  if v_region is null then v_region := v_profile.city; end if;

  v_insight := case
    when v_new_streak >= 7 then 'Semana completa de pulso urbano — você está lendo a cidade como poucos.'
    when v_new_streak >= 3 then 'Rotina formada em ' || coalesce(v_region, 'São Paulo') || '. Confira um mercado ao vivo hoje.'
    else 'Bom dia, analista. O mapa ao vivo já está atualizando regiões de ' || coalesce(v_region, 'São Paulo') || '.'
  end;

  update public.profiles
  set streak = v_new_streak, last_check_in_date = v_today, last_active_at = now()
  where id = v_user_id;

  insert into public.daily_check_ins (user_id, check_in_date, xp_awarded, insight)
  values (v_user_id, v_today, v_xp, v_insight);

  perform set_config('viax.progression', 'off', true);

  v_progress := public.apply_user_progress(v_user_id, 'check_in', v_xp);

  return jsonb_build_object(
    'streak', v_new_streak,
    'xp_awarded', v_xp,
    'insight', v_insight,
    'progress', v_progress
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- grant_email_link_bonus
-- ---------------------------------------------------------------------------
create or replace function public.grant_email_link_bonus()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_claimed boolean;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select email_bonus_claimed into v_claimed from public.profiles where id = v_user_id;
  if v_claimed then
    return jsonb_build_object('already_claimed', true);
  end if;
  perform set_config('viax.progression', 'on', true);
  update public.profiles set email_bonus_claimed = true where id = v_user_id;
  perform set_config('viax.progression', 'off', true);
  return public.apply_user_progress(v_user_id, 'email_linked', 500);
end;
$$;

-- ---------------------------------------------------------------------------
-- use_streak_freeze
-- ---------------------------------------------------------------------------
create or replace function public.use_streak_freeze()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_left int;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;
  select streak_freezes_left into v_left from public.profiles where id = v_user_id for update;
  if v_left <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_freezes');
  end if;
  perform set_config('viax.progression', 'on', true);
  update public.profiles
  set streak_freezes_left = streak_freezes_left - 1,
      last_check_in_date = (timezone('America/Sao_Paulo', now()))::date - 1
  where id = v_user_id;
  perform set_config('viax.progression', 'off', true);
  return jsonb_build_object('ok', true, 'freezes_left', v_left - 1);
end;
$$;

-- ---------------------------------------------------------------------------
-- get_user_achievements
-- ---------------------------------------------------------------------------
create or replace function public.get_user_achievements(p_user_id uuid default auth.uid())
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'description', a.description,
      'unlocked', ua.user_id is not null,
      'unlocked_at', ua.unlocked_at
    ) order by a.sort_order), '[]'::jsonb)
    from public.achievements a
    left join public.user_achievements ua
      on ua.achievement_id = a.id and ua.user_id = p_user_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- get_urbanmind_digest
-- ---------------------------------------------------------------------------
create or replace function public.get_urbanmind_digest()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile profiles%rowtype;
  v_mem user_ai_memory%rowtype;
  v_market markets%rowtype;
  v_rate numeric;
  v_line text;
begin
  if v_user_id is null then return '{}'::jsonb; end if;
  select * into v_profile from public.profiles where id = v_user_id;
  select * into v_mem from public.user_ai_memory where user_id = v_user_id;

  if v_mem.bets_vs_ai > 0 then
    v_rate := round((v_mem.wins_vs_ai::numeric / v_mem.bets_vs_ai) * 100, 0);
  else
    v_rate := null;
  end if;

  if v_mem.last_market_id is not null then
    select * into v_market from public.markets where id = v_mem.last_market_id;
  end if;

  v_line := case
    when v_rate is not null and v_rate >= 50 then
      'Quando você discorda da UrbanMind, acerta ' || v_rate::text || '% das vezes. Use isso no próximo mercado.'
    when v_mem.total_bets > 0 then
      'Você já fez ' || v_mem.total_bets::text || ' palpites. Hoje a IA sugere olhar mercados de ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city) || '.'
    else
      'Comece com um mercado ao vivo na sua região — a UrbanMind mostra onde a cidade e você divergem.'
  end;

  return jsonb_build_object(
    'headline', 'Pulso UrbanMind · ' || coalesce(nullif(trim(v_profile.neighborhood), ''), v_profile.city),
    'body', v_line,
    'wins_vs_ai', coalesce(v_mem.wins_vs_ai, 0),
    'bets_vs_ai', coalesce(v_mem.bets_vs_ai, 0),
    'last_market_id', v_mem.last_market_id,
    'last_side', v_mem.last_side
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- record_comeback_if_needed (3+ days inactive)
-- ---------------------------------------------------------------------------
create or replace function public.record_comeback_if_needed()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last timestamptz;
  v_days int;
begin
  if v_user_id is null then return '{}'::jsonb; end if;
  select last_active_at into v_last from public.profiles where id = v_user_id;
  if v_last is null then
    update public.profiles set last_active_at = now() where id = v_user_id;
    return jsonb_build_object('comeback', false);
  end if;
  v_days := extract(day from now() - v_last)::int;
  update public.profiles set last_active_at = now() where id = v_user_id;
  if v_days >= 3 then
    perform public.insert_user_notification(
      v_user_id, 'alert',
      'A cidade mudou enquanto você estava fora — ' || v_days::text || ' dias. Veja mercados ao vivo.',
      null
    );
    return jsonb_build_object('comeback', true, 'days_away', v_days);
  end if;
  return jsonb_build_object('comeback', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers: AI memory on bet insert; progression on payout
-- ---------------------------------------------------------------------------
create or replace function public.trg_bets_ai_memory()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_vs_ai boolean;
begin
  select * into v_market from public.markets where id = new.market_id;
  v_vs_ai := new.side is distinct from v_market.ai_side;

  insert into public.user_ai_memory (user_id, total_bets, bets_vs_ai, last_market_id, last_side, updated_at)
  values (new.user_id, 1, case when v_vs_ai then 1 else 0 end, new.market_id, new.side, now())
  on conflict (user_id) do update set
    total_bets = user_ai_memory.total_bets + 1,
    bets_vs_ai = user_ai_memory.bets_vs_ai + case when v_vs_ai then 1 else 0 end,
    last_market_id = new.market_id,
    last_side = new.side,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists bets_ai_memory on public.bets;
create trigger bets_ai_memory
  after insert on public.bets
  for each row execute function public.trg_bets_ai_memory();

create or replace function public.trg_bets_on_payout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market markets%rowtype;
  v_won_vs_ai boolean;
begin
  if old.payout is not null or new.payout is null then
    return new;
  end if;

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

  return new;
end;
$$;

drop trigger if exists bets_on_payout on public.bets;
create trigger bets_on_payout
  after update of payout on public.bets
  for each row execute function public.trg_bets_on_payout();

-- ---------------------------------------------------------------------------
-- place_bet: +50 XP on bet
-- ---------------------------------------------------------------------------
create or replace function public.place_bet(
  p_market_id text,
  p_side      bet_side,
  p_stake     numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid := auth.uid();
  v_market       markets%rowtype;
  v_profile      profiles%rowtype;
  v_new_pool_yes numeric;
  v_new_pool_no  numeric;
  v_share        numeric;
  v_bet_id       uuid;
  v_tx_id        uuid;
  v_result       jsonb;
begin
  if v_user_id is null then raise exception 'Unauthorized'; end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if p_stake <= 0 then raise exception 'Stake must be positive'; end if;
  if v_profile.balance < p_stake then raise exception 'Insufficient balance'; end if;

  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status not in ('live', 'closing') then
    raise exception 'Market % does not accept bets (status=%)', p_market_id, v_market.status;
  end if;

  if p_side = 'YES' then
    v_new_pool_yes := v_market.pool_yes + p_stake;
    v_new_pool_no  := v_market.pool_no;
    v_share        := p_stake / v_new_pool_yes;
  else
    v_new_pool_yes := v_market.pool_yes;
    v_new_pool_no  := v_market.pool_no + p_stake;
    v_share        := p_stake / v_new_pool_no;
  end if;

  update public.profiles
  set balance = balance - p_stake, volume_24h = volume_24h + p_stake
  where id = v_user_id;

  update public.markets
  set pool_yes = v_new_pool_yes, pool_no = v_new_pool_no, participants = participants + 1
  where id = p_market_id;

  insert into public.bets (user_id, market_id, side, stake, share)
  values (v_user_id, p_market_id, p_side, p_stake, v_share)
  returning id into v_bet_id;

  insert into public.transactions (user_id, type, market_id, market_label, amount)
  values (v_user_id, 'entry', p_market_id, v_market.region, p_stake)
  returning id into v_tx_id;

  v_result := jsonb_build_object(
    'bet_id', v_bet_id, 'tx_id', v_tx_id,
    'pool_yes', v_new_pool_yes, 'pool_no', v_new_pool_no,
    'balance', v_profile.balance - p_stake
  );

  v_result := v_result || jsonb_build_object('progress', public.apply_user_progress(v_user_id, 'bet_placed', 50));

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- settle_market: use insert_user_notification for wins
-- ---------------------------------------------------------------------------
create or replace function public.settle_market(
  p_market_id text,
  p_winning_side bet_side,
  p_resolution_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market     markets%rowtype;
  v_action     text;
  v_prize      numeric;
  v_pool_win   numeric;
  v_fee        numeric;
  v_bet        record;
  v_payout     numeric;
  v_paid       int := 0;
  v_paid_total numeric := 0;
  v_losing     bet_side;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status in ('settled', 'void') then
    raise exception 'Market already terminal: %', v_market.status;
  end if;

  v_action := public.validate_market_pools(v_market.pool_yes, v_market.pool_no, p_winning_side);
  if v_action = 'void' then
    return public.refund_market(p_market_id, 'pool_validation_failed');
  end if;

  if p_winning_side = 'YES' then
    v_pool_win := v_market.pool_yes;
    v_losing := 'NO';
  else
    v_pool_win := v_market.pool_no;
    v_losing := 'YES';
  end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * (1 - v_market.house_fee_pct);
  v_fee := (v_market.pool_yes + v_market.pool_no) * v_market.house_fee_pct;

  update public.markets
  set status = 'settled', resolved = p_winning_side, accept_bets = false,
      resolved_at = now(), settled_at = now(), updated_at = now()
  where id = p_market_id;

  if v_fee > 0 then
    insert into public.platform_ledger (market_id, amount, kind, meta)
    values (p_market_id, v_fee, 'house_fee',
      jsonb_build_object('pool_yes', v_market.pool_yes, 'pool_no', v_market.pool_no, 'house_fee_pct', v_market.house_fee_pct));
  end if;

  update public.bets set payout = 0
  where market_id = p_market_id and side = v_losing and payout is null;

  for v_bet in
    select b.id, b.user_id, b.stake
    from public.bets b
    where b.market_id = p_market_id and b.side = p_winning_side and b.payout is null
  loop
    v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
    update public.bets set payout = v_payout where id = v_bet.id;
    update public.profiles
    set balance = balance + v_payout, pnl = pnl + (v_payout - v_bet.stake)
    where id = v_bet.user_id;
    insert into public.transactions (user_id, type, market_id, market_label, amount)
    values (v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout);
    perform public.insert_user_notification(
      v_bet.user_id, 'win',
      'Payout de ' || v_payout::text || ' no mercado ' || v_market.region,
      p_market_id
    );
    v_paid := v_paid + 1;
    v_paid_total := v_paid_total + v_payout;
  end loop;

  if p_resolution_id is not null then
    update public.market_resolutions
    set status = 'settled',
        payout_summary = jsonb_build_object(
          'winning_side', p_winning_side, 'prize_pool', v_prize, 'house_fee', v_fee,
          'payouts', v_paid, 'total_paid', v_paid_total)
    where id = p_resolution_id;
  else
    insert into public.market_resolutions (market_id, status, derived_side, source, payout_summary)
    values (p_market_id, 'settled', p_winning_side, 'manual',
      jsonb_build_object('winning_side', p_winning_side, 'prize_pool', v_prize, 'house_fee', v_fee, 'payouts', v_paid, 'total_paid', v_paid_total));
  end if;

  perform public.refresh_market_participant_stats(p_market_id);

  return jsonb_build_object(
    'market_id', p_market_id, 'status', 'settled', 'winning_side', p_winning_side,
    'prize_pool', v_prize, 'house_fee', v_fee, 'payouts', v_paid
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Leaderboard with weekly_growth
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard as
select
  p.id,
  p.name,
  p.handle,
  p.avatar,
  p.division,
  p.accuracy,
  p.roi,
  p.streak,
  p.volume_24h as volume,
  p.city,
  p.neighborhood,
  p.is_ai,
  coalesce(w.weekly_growth, 0)::numeric as weekly_growth,
  rank() over (order by p.accuracy desc, p.roi desc) as global_rank
from public.profiles p
left join lateral (
  select
    case
      when sum(case when b.created_at >= now() - interval '14 days' and b.created_at < now() - interval '7 days' then b.stake else 0 end) > 0
      then (
        coalesce(sum(case when b.payout > 0 and b.created_at >= now() - interval '7 days' then b.payout - b.stake else 0 end), 0)
        - coalesce(sum(case when b.payout > 0 and b.created_at >= now() - interval '14 days' and b.created_at < now() - interval '7 days' then b.payout - b.stake else 0 end), 0)
      ) / nullif(sum(case when b.created_at >= now() - interval '14 days' and b.created_at < now() - interval '7 days' then b.stake else 0 end), 0)
      else 0
    end as weekly_growth
  from public.bets b
  where b.user_id = p.id
) w on true
where p.is_ai = false
order by global_rank;

-- Grants
grant execute on function public.daily_check_in() to authenticated;
grant execute on function public.grant_email_link_bonus() to authenticated;
grant execute on function public.use_streak_freeze() to authenticated;
grant execute on function public.get_user_achievements(uuid) to authenticated;
grant execute on function public.get_urbanmind_digest() to authenticated;
grant execute on function public.record_comeback_if_needed() to authenticated;
