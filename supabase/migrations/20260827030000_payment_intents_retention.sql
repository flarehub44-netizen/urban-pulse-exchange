-- Semana 4: payment_intents retention guard + compliance indexes
--
-- Bacen/COAF requirement: financial transaction records must be retained for
-- 5 years (Lei 9.613/98, art. 10, §2º; Resolução BCB 149/2021).
--
-- This migration:
--   1. Prevents hard-delete of payment_intents from any authenticated client.
--      Only service_role / postgres may delete rows (e.g., test cleanup).
--   2. Adds compliance indexes to speed up the queries used in audits:
--        - Monthly withdrawal totals per user (used by the KYC gate)
--        - Date-range transaction reporting
--   3. Documents the retention policy via table comment.

-- ---------------------------------------------------------------------------
-- 1. Delete guard trigger
-- ---------------------------------------------------------------------------
create or replace function public.guard_payment_intents_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow only privileged roles (service workers, migrations)
  if current_setting('role', true) in ('service_role', 'postgres', 'supabase_admin') then
    return old;
  end if;
  raise exception
    'payment_intents_protected: registros de pagamento não podem ser excluídos. '
    'Para cancelar, atualize o status para ''failed''.';
end;
$$;

drop trigger if exists payment_intents_guard_delete on public.payment_intents;
create trigger payment_intents_guard_delete
  before delete on public.payment_intents
  for each row execute function public.guard_payment_intents_delete();

-- ---------------------------------------------------------------------------
-- 2. Compliance indexes
-- ---------------------------------------------------------------------------

-- Speeds up the V07 KYC cumulative gate (called on every withdrawal)
create index if not exists payment_intents_kyc_gate_idx
  on public.payment_intents (user_id, settled_at desc)
  where type = 'withdraw' and status = 'paid';

-- Supports audit queries: all paid/failed intents for a user in a date range
create index if not exists payment_intents_audit_idx
  on public.payment_intents (user_id, type, status, created_at desc)
  where status in ('paid', 'failed');

-- Supports COAF structuring detection: high-volume low-value withdrawals
create index if not exists payment_intents_structuring_idx
  on public.payment_intents (created_at desc, amount)
  where type = 'withdraw' and status = 'paid';

-- ---------------------------------------------------------------------------
-- 3. Retention policy comment
-- ---------------------------------------------------------------------------
comment on table public.payment_intents is
  'Registros de intenções de pagamento Pix (depósitos e saques). '
  'RETENÇÃO OBRIGATÓRIA: mínimo 5 anos conforme Lei 9.613/98 art. 10 §2º e '
  'Resolução BCB 149/2021. Não apagar registros com status paid/failed. '
  'Soft-cancel via status = ''failed'' com meta.reason = ''cancelled_by_admin''.';
