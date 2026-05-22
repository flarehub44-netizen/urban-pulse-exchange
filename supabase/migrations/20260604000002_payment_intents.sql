-- Tabela para rastrear intenções de pagamento Pix (SyncPay)
-- Cada depósito/saque real passa por aqui antes de atualizar o saldo.

create table if not exists public.payment_intents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider_id  text,                           -- ID da transação no SyncPay
  type         text not null check (type in ('deposit', 'withdraw')),
  amount       numeric(12,2) not null check (amount > 0),
  status       text not null default 'pending'
               check (status in ('pending', 'paid', 'failed', 'expired')),
  pix_key      text,                           -- chave Pix do usuário (saques)
  qr_code      text,                           -- EMV / Pix Copia e Cola (depósitos)
  qr_code_img  text,                           -- base64 do QR Code para exibição
  expires_at   timestamptz,
  settled_at   timestamptz,
  meta         jsonb not null default '{}',    -- payload completo do provider
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists payment_intents_user_id_created
  on public.payment_intents(user_id, created_at desc);

create index if not exists payment_intents_provider_id
  on public.payment_intents(provider_id)
  where provider_id is not null;

alter table public.payment_intents enable row level security;

-- Usuário só lê suas próprias intenções
create policy "payment_intents_read_own"
  on public.payment_intents for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserção somente via service_role (server action)
create policy "payment_intents_insert_service"
  on public.payment_intents for insert
  to service_role
  with check (true);

-- Atualização somente via service_role (webhook)
create policy "payment_intents_update_service"
  on public.payment_intents for update
  to service_role
  using (true);

-- Coluna kyc_status em profiles (gate para saques)
alter table public.profiles
  add column if not exists kyc_status text not null default 'none'
    check (kyc_status in ('none', 'pending', 'approved', 'rejected'));

alter table public.profiles
  add column if not exists pix_key text;

-- RPC de saque bloqueado sem KYC aprovado para valores > R$ 100
-- (substitui wallet_withdraw para saques reais — o saldo só muda após webhook SyncPay)
create or replace function public.request_withdrawal(
  p_amount  numeric,
  p_pix_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_profile profiles%rowtype;
  v_intent  uuid;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;
  if p_pix_key is null or length(trim(p_pix_key)) = 0 then
    raise exception 'Pix key is required';
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Profile not found'; end if;

  -- KYC gate: saques acima de R$ 100 exigem verificação
  if p_amount > 100 and v_profile.kyc_status != 'approved' then
    raise exception 'kyc_required: complete identity verification to withdraw above R$ 100';
  end if;

  if v_profile.balance < p_amount then raise exception 'Insufficient balance'; end if;

  -- Reservar saldo imediatamente (liberado se o saque falhar no webhook)
  update public.profiles
  set balance = balance - p_amount
  where id = v_uid;

  -- Registrar intent — o processamento real ocorre via server action que chama SyncPay
  insert into public.payment_intents (user_id, type, amount, pix_key, status)
  values (v_uid, 'withdraw', p_amount, p_pix_key, 'pending')
  returning id into v_intent;

  -- Ledger: reserva de saldo
  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    v_uid, 'withdraw', p_amount, 'Saque Pix',
    v_profile.balance,
    v_profile.balance - p_amount
  );

  return jsonb_build_object('intent_id', v_intent, 'balance', v_profile.balance - p_amount);
end;
$$;

grant execute on function public.request_withdrawal(numeric, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs para uso exclusivo do webhook (service_role — sem auth.uid())
-- ---------------------------------------------------------------------------

-- Credita saldo após confirmação de depósito Pix pelo SyncPay
create or replace function public.service_credit_balance(
  p_user_id  uuid,
  p_amount   numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'deposit', p_amount, 'Depósito Pix',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'alert',
    'Depósito de R$ ' || p_amount::text || ' confirmado!'
  );
end;
$$;

-- Estorna saldo em caso de saque reprovado/falho
create or replace function public.service_refund_withdrawal(
  p_user_id   uuid,
  p_amount    numeric,
  p_intent_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance_after numeric;
begin
  update public.profiles
  set balance = balance + p_amount
  where id = p_user_id
  returning balance into v_balance_after;

  if not found then
    raise exception 'Profile not found: %', p_user_id;
  end if;

  insert into public.transactions (
    user_id, type, amount, market_label,
    before_balance, after_balance
  )
  values (
    p_user_id, 'refund', p_amount, 'Estorno de Saque',
    v_balance_after - p_amount,
    v_balance_after
  );

  insert into public.notifications (user_id, kind, text)
  values (
    p_user_id, 'refund',
    'Saque de R$ ' || p_amount::text || ' não pôde ser processado. Saldo estornado.'
  );
end;
$$;

-- Apenas service_role pode chamar estes RPCs
revoke execute on function public.service_credit_balance(uuid, numeric, uuid) from authenticated;
revoke execute on function public.service_credit_balance(uuid, numeric, uuid) from anon;
revoke execute on function public.service_refund_withdrawal(uuid, numeric, uuid) from authenticated;
revoke execute on function public.service_refund_withdrawal(uuid, numeric, uuid) from anon;
