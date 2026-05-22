-- Creator Partner Program: attribution, revenue share on rake, sub-partners (2 levels)

-- ---------------------------------------------------------------------------
-- Types & tables
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.partner_status as enum ('pending', 'active', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists public.partner_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique,
  status partner_status not null default 'pending',
  tier text not null default 'Bronze',
  revenue_share_pct numeric(6,4) not null default 0.20
    check (revenue_share_pct > 0 and revenue_share_pct <= 1),
  balance numeric(14,2) not null default 0 check (balance >= 0),
  pending_balance numeric(14,2) not null default 0 check (pending_balance >= 0),
  parent_partner_id uuid references public.partner_accounts(user_id) on delete set null,
  verified boolean not null default false,
  commission_boost_pct numeric(6,4) not null default 0,
  commission_boost_until timestamptz,
  sub_invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_accounts_parent on public.partner_accounts(parent_partner_id);
create index if not exists partner_accounts_status on public.partner_accounts(status);

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bio text not null default '',
  social_links jsonb not null default '{}'::jsonb,
  focus_city text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists partner_applications_one_pending
  on public.partner_applications(user_id) where (status = 'pending');

create table if not exists public.partner_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  name text not null,
  slug_suffix text,
  target jsonb not null default '{"path":"/dashboard"}'::jsonb,
  clicks int not null default 0,
  conversions int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists partner_campaigns_partner on public.partner_campaigns(partner_id);

create table if not exists public.referral_clicks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.partner_campaigns(id) on delete set null,
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  ip_hash text,
  utm jsonb default '{}'::jsonb,
  converted_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists referral_clicks_partner on public.referral_clicks(partner_id, created_at desc);

create table if not exists public.user_referrals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  partner_id uuid not null references public.partner_accounts(user_id) on delete restrict,
  campaign_id uuid references public.partner_campaigns(id) on delete set null,
  sub_partner_id uuid references public.partner_accounts(user_id) on delete set null,
  first_deposit_at timestamptz,
  first_bet_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists user_referrals_partner on public.user_referrals(partner_id);

create table if not exists public.partner_commission_ledger (
  id bigserial primary key,
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  market_id text references public.markets(id) on delete set null,
  amount numeric(14,2) not null,
  rake_base numeric(14,2) not null default 0,
  referred_volume numeric(14,2) not null default 0,
  kind text not null default 'revenue_share',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_commission_partner on public.partner_commission_ledger(partner_id, created_at desc);

create table if not exists public.partner_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'pix',
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists public.partner_events (
  id bigserial primary key,
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  kind text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists partner_events_partner on public.partner_events(partner_id, created_at desc);

create table if not exists public.partner_missions (
  id text primary key,
  title text not null,
  description text not null,
  target_value numeric not null,
  metric text not null,
  reward_boost_pct numeric not null default 0.05,
  active boolean not null default true
);

create table if not exists public.partner_mission_progress (
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  mission_id text not null references public.partner_missions(id) on delete cascade,
  progress numeric not null default 0,
  completed_at timestamptz,
  week_start date not null default (date_trunc('week', timezone('America/Sao_Paulo', now())))::date,
  primary key (partner_id, mission_id, week_start)
);

create table if not exists public.partner_leaderboard_snapshots (
  partner_id uuid not null references public.partner_accounts(user_id) on delete cascade,
  snapshot_date date not null,
  rank int not null,
  score numeric not null,
  metric text not null default 'volume',
  primary key (partner_id, snapshot_date, metric)
);

alter table public.partner_accounts enable row level security;
alter table public.partner_applications enable row level security;
alter table public.partner_campaigns enable row level security;
alter table public.referral_clicks enable row level security;
alter table public.user_referrals enable row level security;
alter table public.partner_commission_ledger enable row level security;
alter table public.partner_payouts enable row level security;
alter table public.partner_events enable row level security;
alter table public.partner_mission_progress enable row level security;

create policy "partner_accounts_own" on public.partner_accounts for select using (auth.uid() = user_id);
create policy "partner_applications_own" on public.partner_applications for select using (auth.uid() = user_id);
create policy "partner_applications_insert_own" on public.partner_applications for insert with check (auth.uid() = user_id);
create policy "partner_campaigns_own" on public.partner_campaigns for all using (auth.uid() = partner_id);
create policy "partner_commission_own" on public.partner_commission_ledger for select using (auth.uid() = partner_id);
create policy "partner_payouts_own" on public.partner_payouts for select using (auth.uid() = partner_id);
create policy "partner_events_own" on public.partner_events for select using (auth.uid() = partner_id);
create policy "partner_mission_own" on public.partner_mission_progress for select using (auth.uid() = partner_id);

insert into public.platform_settings (key, value) values
  ('partner_program_enabled', 'true'::jsonb),
  ('default_revenue_share_pct', '0.20'::jsonb),
  ('sub_override_pct', '0.10'::jsonb),
  ('min_payout_amount', '50'::jsonb)
on conflict (key) do nothing;

insert into public.partner_missions (id, title, description, target_value, metric, reward_boost_pct) values
  ('invite_10_week', '10 convites na semana', 'Indique 10 novos traders esta semana', 10, 'signups', 0.05),
  ('volume_50k_week', 'R$ 50k de volume', 'Volume gerado por indicados esta semana', 50000, 'volume', 0.08)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_partner_program_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select case jsonb_typeof(value) when 'boolean' then (value)::text::boolean else (value #>> '{}')::boolean end
     from public.platform_settings where key = 'partner_program_enabled'),
    true
  );
$$;

create or replace function public.partner_setting_num(p_key text, p_default numeric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (value #>> '{}')::numeric from public.platform_settings where key = p_key),
    p_default
  );
$$;

create or replace function public.trg_partner_parent_depth()
returns trigger
language plpgsql
as $$
declare v_grand uuid;
begin
  if new.parent_partner_id is null then return new; end if;
  select parent_partner_id into v_grand from public.partner_accounts where user_id = new.parent_partner_id;
  if v_grand is not null then
    raise exception 'Sub-partners limited to 2 levels';
  end if;
  return new;
end;
$$;

drop trigger if exists partner_parent_depth on public.partner_accounts;
create trigger partner_parent_depth
  before insert or update of parent_partner_id on public.partner_accounts
  for each row execute function public.trg_partner_parent_depth();

create or replace function public.emit_partner_event(
  p_partner_id uuid,
  p_kind text,
  p_message text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.partner_events (partner_id, kind, message, meta)
  values (p_partner_id, p_kind, p_message, p_meta);
end;
$$;

-- ---------------------------------------------------------------------------
-- Commission allocation on settle
-- ---------------------------------------------------------------------------
create or replace function public.allocate_partner_commissions(
  p_market_id text,
  p_house_fee numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_pool numeric;
  v_rec record;
  v_partner partner_accounts%rowtype;
  v_share numeric;
  v_commission numeric;
  v_boost numeric := 1;
  v_override_pct numeric;
  v_override_amt numeric;
  v_parent uuid;
begin
  if not public.is_partner_program_enabled() or p_house_fee <= 0 then return; end if;

  select pool_yes + pool_no into v_total_pool from public.markets where id = p_market_id;
  if v_total_pool <= 0 then return; end if;

  v_override_pct := public.partner_setting_num('sub_override_pct', 0.10);

  for v_rec in
    select ur.partner_id, coalesce(sum(b.stake), 0) as referred_vol
    from public.bets b
    inner join public.user_referrals ur on ur.user_id = b.user_id
    where b.market_id = p_market_id
    group by ur.partner_id
    having sum(b.stake) > 0
  loop
    select * into v_partner from public.partner_accounts
    where user_id = v_rec.partner_id and status = 'active';
    if not found then continue; end if;

    if v_partner.commission_boost_until is not null and v_partner.commission_boost_until > now() then
      v_boost := 1 + v_partner.commission_boost_pct;
    else
      v_boost := 1;
    end if;

    v_share := v_rec.referred_vol / v_total_pool;
    v_commission := round(p_house_fee * v_share * v_partner.revenue_share_pct * v_boost, 2);
    if v_commission <= 0 then continue; end if;

    insert into public.partner_commission_ledger (partner_id, market_id, amount, rake_base, referred_volume, meta)
    values (v_rec.partner_id, p_market_id, v_commission, p_house_fee, v_rec.referred_vol,
      jsonb_build_object('share', v_share, 'boost', v_boost));

    update public.partner_accounts
    set balance = balance + v_commission, updated_at = now()
    where user_id = v_rec.partner_id;

    perform public.emit_partner_event(
      v_rec.partner_id, 'commission',
      'Comissão de R$ ' || v_commission::text || ' no mercado ' || p_market_id,
      jsonb_build_object('amount', v_commission, 'market_id', p_market_id)
    );

    select parent_partner_id into v_parent from public.partner_accounts where user_id = v_rec.partner_id;
    if v_parent is not null then
      v_override_amt := round(v_commission * v_override_pct, 2);
      if v_override_amt > 0 then
        insert into public.partner_commission_ledger (partner_id, market_id, amount, rake_base, referred_volume, kind, meta)
        values (v_parent, p_market_id, v_override_amt, p_house_fee, v_rec.referred_vol, 'sub_override',
          jsonb_build_object('sub_partner_id', v_rec.partner_id));
        update public.partner_accounts set balance = balance + v_override_amt, updated_at = now() where user_id = v_parent;
      end if;
    end if;
  end loop;
end;
$$;

-- Extend settle_market
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
    perform public.allocate_partner_commissions(p_market_id, v_fee);
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

-- First bet attribution
create or replace function public.trg_bets_first_referral_bet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_referrals set first_bet_at = now()
  where user_id = new.user_id and first_bet_at is null;
  return new;
end;
$$;

drop trigger if exists bets_first_referral on public.bets;
create trigger bets_first_referral
  after insert on public.bets
  for each row execute function public.trg_bets_first_referral_bet();

-- ---------------------------------------------------------------------------
-- Public: resolve slug & track click
-- ---------------------------------------------------------------------------
create or replace function public.resolve_partner_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_partner partner_accounts%rowtype;
  v_campaign partner_campaigns%rowtype;
  v_full_slug text := lower(trim(p_slug));
  v_base text;
  v_suffix text;
begin
  if not public.is_partner_program_enabled() then
    return jsonb_build_object('ok', false, 'reason', 'disabled');
  end if;

  select * into v_partner from public.partner_accounts
  where lower(slug) = v_full_slug and status = 'active';
  if found then
    return jsonb_build_object(
      'ok', true, 'partner_id', v_partner.user_id, 'slug', v_partner.slug,
      'target', jsonb_build_object('path', '/dashboard')
    );
  end if;

  if position('/' in v_full_slug) > 0 then
    v_base := split_part(v_full_slug, '/', 1);
    v_suffix := split_part(v_full_slug, '/', 2);
    select * into v_partner from public.partner_accounts where lower(slug) = v_base and status = 'active';
    if found then
      select * into v_campaign from public.partner_campaigns
      where partner_id = v_partner.user_id and (slug_suffix is null or lower(slug_suffix) = v_suffix)
      order by created_at desc limit 1;
      if found then
        return jsonb_build_object(
          'ok', true, 'partner_id', v_partner.user_id, 'slug', v_partner.slug,
          'campaign_id', v_campaign.id, 'target', v_campaign.target
        );
      end if;
      return jsonb_build_object(
        'ok', true, 'partner_id', v_partner.user_id, 'slug', v_partner.slug,
        'target', jsonb_build_object('path', '/dashboard')
      );
    end if;
  end if;

  return jsonb_build_object('ok', false, 'reason', 'not_found');
end;
$$;

create or replace function public.track_partner_click(
  p_slug text,
  p_campaign_id uuid default null,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
  v_partner_id uuid;
  v_cid uuid := p_campaign_id;
begin
  v_res := public.resolve_partner_slug(p_slug);
  if not (v_res->>'ok')::boolean then return v_res; end if;
  v_partner_id := (v_res->>'partner_id')::uuid;
  if v_cid is null and v_res ? 'campaign_id' then v_cid := (v_res->>'campaign_id')::uuid; end if;

  insert into public.referral_clicks (campaign_id, partner_id, ip_hash)
  values (v_cid, v_partner_id, p_ip_hash);

  if v_cid is not null then
    update public.partner_campaigns set clicks = clicks + 1 where id = v_cid;
  end if;

  return v_res || jsonb_build_object('click_tracked', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Bind referral (first-touch)
-- ---------------------------------------------------------------------------
create or replace function public.bind_referral_attribution(
  p_slug text,
  p_campaign_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_res jsonb;
  v_partner_id uuid;
  v_cid uuid;
  v_sub uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if exists (select 1 from public.user_referrals where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_attributed');
  end if;

  v_res := public.resolve_partner_slug(p_slug);
  if not (v_res->>'ok')::boolean then return jsonb_build_object('ok', false, 'reason', 'invalid_slug'); end if;
  v_partner_id := (v_res->>'partner_id')::uuid;
  if v_partner_id = v_uid then return jsonb_build_object('ok', false, 'reason', 'self_referral'); end if;

  v_cid := coalesce(p_campaign_id, (v_res->>'campaign_id')::uuid);

  insert into public.user_referrals (user_id, partner_id, campaign_id)
  values (v_uid, v_partner_id, v_cid);

  update public.referral_clicks rc
  set converted_user_id = v_uid
  from (
    select id from public.referral_clicks
    where partner_id = v_partner_id and converted_user_id is null
      and created_at >= now() - interval '30 days'
    order by created_at desc limit 1
  ) last
  where rc.id = last.id;

  if v_cid is not null then
    update public.partner_campaigns set conversions = conversions + 1 where id = v_cid;
  end if;

  perform public.emit_partner_event(v_partner_id, 'signup', 'Novo trader entrou via seu link', jsonb_build_object('user_id', v_uid));

  return jsonb_build_object('ok', true, 'partner_id', v_partner_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply / partner status
-- ---------------------------------------------------------------------------
create or replace function public.apply_partner_program(
  p_bio text,
  p_focus_city text default null,
  p_social jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_handle text;
  v_slug text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if exists (select 1 from public.partner_accounts where user_id = v_uid) then
    return jsonb_build_object('ok', false, 'reason', 'already_partner');
  end if;
  if exists (select 1 from public.partner_applications where user_id = v_uid and status = 'pending') then
    return jsonb_build_object('ok', false, 'reason', 'pending_application');
  end if;

  select handle into v_handle from public.profiles where id = v_uid;
  v_slug := lower(regexp_replace(coalesce(v_handle, 'trader'), '[^a-z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if length(v_slug) < 3 then v_slug := 'creator-' || substr(v_uid::text, 1, 8); end if;

  insert into public.partner_applications (user_id, bio, focus_city, social_links)
  values (v_uid, coalesce(p_bio, ''), p_focus_city, coalesce(p_social, '{}'::jsonb));

  return jsonb_build_object('ok', true, 'proposed_slug', v_slug);
end;
$$;

create or replace function public.get_my_partner_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pa partner_accounts%rowtype;
  v_app partner_applications%rowtype;
begin
  if v_uid is null then return '{}'::jsonb; end if;
  select * into v_pa from public.partner_accounts where user_id = v_uid;
  if found then
    return jsonb_build_object(
      'role', 'partner', 'status', v_pa.status, 'slug', v_pa.slug, 'tier', v_pa.tier,
      'verified', v_pa.verified, 'balance', v_pa.balance
    );
  end if;
  select * into v_app from public.partner_applications where user_id = v_uid and status = 'pending' order by created_at desc limit 1;
  if found then
    return jsonb_build_object('role', 'applicant', 'status', 'pending');
  end if;
  return jsonb_build_object('role', 'none');
end;
$$;

-- Dashboard metrics RPC
create or replace function public.get_partner_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_pa partner_accounts%rowtype;
  v_referrals int;
  v_volume numeric;
  v_revenue numeric;
  v_clicks int;
  v_conversions int;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select * into v_pa from public.partner_accounts where user_id = v_uid and status = 'active';
  if not found then raise exception 'Not an active partner'; end if;

  select count(*) into v_referrals from public.user_referrals where partner_id = v_uid;
  select coalesce(sum(b.stake), 0) into v_volume
  from public.bets b join public.user_referrals ur on ur.user_id = b.user_id where ur.partner_id = v_uid;
  select coalesce(sum(amount), 0) into v_revenue from public.partner_commission_ledger where partner_id = v_uid;
  select coalesce(sum(clicks), 0), coalesce(sum(conversions), 0) into v_clicks, v_conversions
  from public.partner_campaigns where partner_id = v_uid;

  return jsonb_build_object(
    'balance', v_pa.balance,
    'tier', v_pa.tier,
    'slug', v_pa.slug,
    'referrals', v_referrals,
    'volume', v_volume,
    'revenue', v_revenue,
    'clicks', v_clicks,
    'conversions', v_conversions,
    'conversion_rate', case when v_clicks > 0 then round((v_conversions::numeric / v_clicks) * 100, 1) else 0 end,
    'revenue_share_pct', v_pa.revenue_share_pct
  );
end;
$$;

create or replace function public.get_partner_revenue_series(p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('day', d::date, 'amount', amt) order by d)
    from (
      select date_trunc('day', created_at) as d, sum(amount) as amt
      from public.partner_commission_ledger
      where partner_id = v_uid and created_at >= now() - (p_days || ' days')::interval
      group by 1
    ) s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_partner_events_feed(p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('kind', kind, 'message', message, 'at', created_at) order by created_at desc)
    from (select kind, message, created_at from public.partner_events where partner_id = v_uid order by created_at desc limit p_limit) e
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_partner_invites_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', ur.user_id,
      'handle', p.handle,
      'city', p.city,
      'first_deposit', ur.first_deposit_at is not null,
      'first_bet', ur.first_bet_at is not null,
      'joined_at', ur.created_at
    ) order by ur.created_at desc)
    from public.user_referrals ur
    join public.profiles p on p.id = ur.user_id
    where ur.partner_id = v_uid
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_partner_campaigns()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'slug_suffix', c.slug_suffix, 'target', c.target,
      'clicks', c.clicks, 'conversions', c.conversions, 'created_at', c.created_at
    ) order by c.created_at desc)
    from public.partner_campaigns c where c.partner_id = v_uid
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_partner_campaign(
  p_name text,
  p_slug_suffix text default null,
  p_target jsonb default '{"path":"/dashboard"}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_slug text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if not exists (select 1 from public.partner_accounts where user_id = v_uid and status = 'active') then
    raise exception 'Active partner required';
  end if;
  select slug into v_slug from public.partner_accounts where user_id = v_uid;
  insert into public.partner_campaigns (partner_id, name, slug_suffix, target)
  values (v_uid, p_name, nullif(trim(p_slug_suffix), ''), coalesce(p_target, '{"path":"/dashboard"}'::jsonb))
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'link_path', '/r/' || v_slug || case when p_slug_suffix is not null and trim(p_slug_suffix) <> '' then '/' || trim(p_slug_suffix) else '' end);
end;
$$;

create or replace function public.get_partner_leaderboard(p_metric text default 'volume')
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return coalesce((
    select jsonb_agg(row order by score desc)
    from (
      select jsonb_build_object(
        'partner_id', pa.user_id,
        'slug', pa.slug,
        'tier', pa.tier,
        'name', p.name,
        'handle', p.handle,
        'score', coalesce((
          select sum(b.stake) from public.bets b
          join public.user_referrals ur on ur.user_id = b.user_id
          where ur.partner_id = pa.user_id and b.created_at >= now() - interval '30 days'
        ), 0)
      ) as row,
      coalesce((
        select sum(b.stake) from public.bets b
        join public.user_referrals ur on ur.user_id = b.user_id
        where ur.partner_id = pa.user_id and b.created_at >= now() - interval '30 days'
      ), 0) as score
      from public.partner_accounts pa
      join public.profiles p on p.id = pa.user_id
      where pa.status = 'active'
      order by score desc
      limit 50
    ) t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_partner_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_d1 int; v_d7 int; v_d30 int;
  v_by_city jsonb;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select count(*) into v_d1 from public.user_referrals ur
  join public.bets b on b.user_id = ur.user_id
  where ur.partner_id = v_uid and b.created_at >= now() - interval '1 day';
  select count(distinct ur.user_id) into v_d7 from public.user_referrals ur
  where ur.partner_id = v_uid and ur.created_at >= now() - interval '7 days';
  select count(*) into v_d30 from public.user_referrals where partner_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object('city', city, 'volume', vol)), '[]'::jsonb) into v_by_city
  from (
    select coalesce(p.city, 'Outros') as city, sum(b.stake) as vol
    from public.bets b
    join public.user_referrals ur on ur.user_id = b.user_id
    join public.profiles p on p.id = ur.user_id
    where ur.partner_id = v_uid
    group by 1 order by vol desc limit 12
  ) c;

  return jsonb_build_object(
    'active_bets_24h', v_d1,
    'new_referrals_7d', v_d7,
    'total_referrals', v_d30,
    'volume_by_city', v_by_city
  );
end;
$$;

create or replace function public.get_partner_sub_affiliates()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select sub_invite_code into v_code from public.partner_accounts where user_id = v_uid;
  if v_code is null then
    v_code := upper(substr(md5(v_uid::text || now()::text), 1, 8));
    update public.partner_accounts set sub_invite_code = v_code where user_id = v_uid;
  end if;
  return jsonb_build_object(
    'invite_code', v_code,
    'subs', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', pa.user_id, 'slug', pa.slug, 'tier', pa.tier, 'balance', pa.balance))
      from public.partner_accounts pa where pa.parent_partner_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.claim_sub_partner_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_master uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  select user_id into v_master from public.partner_accounts
  where sub_invite_code = upper(trim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('ok', false); end if;
  if v_master = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;

  insert into public.partner_accounts (user_id, slug, status, parent_partner_id, revenue_share_pct)
  select v_uid, lower(p.handle), 'pending', v_master, public.partner_setting_num('default_revenue_share_pct', 0.20)
  from public.profiles p where p.id = v_uid
  on conflict (user_id) do update set parent_partner_id = excluded.parent_partner_id
  where partner_accounts.status = 'pending';

  return jsonb_build_object('ok', true, 'master_id', v_master);
end;
$$;

create or replace function public.partner_request_payout(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_min numeric;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  v_min := public.partner_setting_num('min_payout_amount', 50);
  if p_amount < v_min then raise exception 'Minimum payout is %', v_min; end if;

  select balance into v_bal from public.partner_accounts where user_id = v_uid and status = 'active' for update;
  if not found then raise exception 'Not active partner'; end if;
  if v_bal < p_amount then raise exception 'Insufficient balance'; end if;

  update public.partner_accounts set balance = balance - p_amount where user_id = v_uid;
  insert into public.partner_payouts (partner_id, amount) values (v_uid, p_amount);

  return jsonb_build_object('ok', true, 'balance', v_bal - p_amount);
end;
$$;

create or replace function public.get_partner_payouts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', id, 'amount', amount, 'method', method, 'at', created_at) order by created_at desc)
    from public.partner_payouts where partner_id = v_uid limit 50
  ), '[]'::jsonb);
end;
$$;

-- First deposit on referred user
create or replace function public.trg_wallet_deposit_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ur user_referrals%rowtype;
begin
  -- handled via wallet_deposit wrapper below
  return new;
end;
$$;

create or replace function public.wallet_deposit(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tx_id uuid;
  v_balance numeric;
  v_ur user_referrals%rowtype;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if p_amount > 500000 then raise exception 'Amount exceeds limit'; end if;

  update public.profiles set balance = balance + p_amount where id = v_uid returning balance into v_balance;
  insert into public.transactions (user_id, type, amount, market_label)
  values (v_uid, 'deposit', p_amount, 'Carteira') returning id into v_tx_id;

  select * into v_ur from public.user_referrals where user_id = v_uid and first_deposit_at is null;
  if found then
    update public.user_referrals set first_deposit_at = now() where user_id = v_uid;
    perform public.emit_partner_event(
      v_ur.partner_id, 'deposit',
      'Indicado depositou R$ ' || p_amount::text,
      jsonb_build_object('user_id', v_uid, 'amount', p_amount)
    );
  end if;

  return jsonb_build_object('tx_id', v_tx_id, 'balance', v_balance);
end;
$$;

-- Admin
create or replace function public.admin_list_partner_applications()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id, 'user_id', a.user_id, 'handle', p.handle, 'name', p.name,
      'bio', a.bio, 'focus_city', a.focus_city, 'created_at', a.created_at
    ) order by a.created_at desc)
    from public.partner_applications a
    join public.profiles p on p.id = a.user_id
    where a.status = 'pending'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_approve_partner(
  p_user_id uuid,
  p_tier text default 'Bronze',
  p_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_share numeric;
begin
  perform public.assert_admin();
  select handle into v_slug from public.profiles where id = p_user_id;
  v_slug := coalesce(nullif(trim(p_slug), ''), lower(regexp_replace(v_slug, '[^a-z0-9]+', '-', 'g')));
  v_share := public.partner_setting_num('default_revenue_share_pct', 0.20);

  insert into public.partner_accounts (user_id, slug, status, tier, revenue_share_pct, verified)
  values (p_user_id, v_slug, 'active', coalesce(p_tier, 'Bronze'), v_share, true)
  on conflict (user_id) do update set status = 'active', tier = excluded.tier, verified = true;

  update public.partner_applications set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = p_user_id and status = 'pending';

  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.admin_reject_partner(p_user_id uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  update public.partner_applications set status = 'rejected', note = p_note, reviewed_by = auth.uid(), reviewed_at = now()
  where user_id = p_user_id and status = 'pending';
  return jsonb_build_object('ok', true);
end;
$$;

-- Extend admin_update_setting keys
create or replace function public.admin_update_setting(p_key text, p_value jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_key not in (
    'house_fee_rate', 'max_stake', 'market_duration_hours', 'regions_enabled',
    'partner_program_enabled', 'default_revenue_share_pct', 'sub_override_pct', 'min_payout_amount'
  ) then
    raise exception 'Invalid setting key';
  end if;
  insert into public.platform_settings (key, value, updated_by)
  values (p_key, p_value, auth.uid())
  on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by;
  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (auth.uid(), 'update_setting', 'platform_settings', p_key, p_value);
  return jsonb_build_object('ok', true, 'key', p_key);
end;
$$;

-- Public expert profile fields
create or replace function public.get_public_expert_profile(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pa partner_accounts%rowtype;
  v_top_regions jsonb;
begin
  select * into v_pa from public.partner_accounts where user_id = p_user_id and status = 'active';
  select coalesce(jsonb_agg(jsonb_build_object('region', region, 'bets', cnt) order by cnt desc), '[]'::jsonb)
  into v_top_regions
  from (
    select m.region, count(*) as cnt
    from public.bets b join public.markets m on m.id = b.market_id
    where b.user_id = p_user_id
    group by m.region order by cnt desc limit 3
  ) t;

  return jsonb_build_object(
    'is_partner', FOUND,
    'partner_slug', case when FOUND then v_pa.slug end,
    'partner_verified', case when FOUND then v_pa.verified else false end,
    'top_regions', v_top_regions
  );
end;
$$;

grant execute on function public.is_partner_program_enabled() to anon, authenticated;
grant execute on function public.resolve_partner_slug(text) to anon, authenticated;
grant execute on function public.track_partner_click(text, uuid, text) to anon, authenticated;
grant execute on function public.bind_referral_attribution(text, uuid) to authenticated;
grant execute on function public.apply_partner_program(text, text, jsonb) to authenticated;
grant execute on function public.get_my_partner_status() to authenticated;
grant execute on function public.get_partner_overview() to authenticated;
grant execute on function public.get_partner_revenue_series(int) to authenticated;
grant execute on function public.get_partner_events_feed(int) to authenticated;
grant execute on function public.get_partner_invites_list() to authenticated;
grant execute on function public.get_partner_campaigns() to authenticated;
grant execute on function public.create_partner_campaign(text, text, jsonb) to authenticated;
grant execute on function public.get_partner_leaderboard(text) to authenticated;
grant execute on function public.get_partner_analytics() to authenticated;
grant execute on function public.get_partner_sub_affiliates() to authenticated;
grant execute on function public.claim_sub_partner_invite(text) to authenticated;
grant execute on function public.partner_request_payout(numeric) to authenticated;
grant execute on function public.get_partner_payouts() to authenticated;
grant execute on function public.get_public_expert_profile(uuid) to anon, authenticated;
grant execute on function public.admin_list_partner_applications() to authenticated;
grant execute on function public.admin_approve_partner(uuid, text, text) to authenticated;
grant execute on function public.admin_reject_partner(uuid, text) to authenticated;
