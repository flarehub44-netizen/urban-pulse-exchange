-- Repair: CPA risk RPCs missing on remote despite migration history (admin_list_cpa_fraud_cases absent).
-- Idempotent: safe to re-run.

create table if not exists public.cpa_fraud_flags (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  partner_id uuid references public.partner_accounts(user_id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'confirmed', 'cleared', 'resolved')),
  risk_score int not null default 50 check (risk_score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  notes text,
  is_cpa_counted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists cpa_fraud_flags_user_id_uniq
  on public.cpa_fraud_flags(user_id);

create index if not exists cpa_fraud_flags_partner_status_created
  on public.cpa_fraud_flags(partner_id, status, created_at desc);

alter table public.cpa_fraud_flags enable row level security;

drop policy if exists cpa_fraud_flags_deny_all on public.cpa_fraud_flags;
create policy cpa_fraud_flags_deny_all
  on public.cpa_fraud_flags
  for all
  to authenticated
  using (false)
  with check (false);

create or replace function public.admin_list_cpa_fraud_cases(
  p_status text default null,
  p_limit int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_status text := nullif(trim(coalesce(p_status, '')), '');
begin
  perform public.assert_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'flag_id', x.flag_id,
          'user_id', x.user_id,
          'user_handle', x.user_handle,
          'user_name', x.user_name,
          'partner_id', x.partner_id,
          'partner_handle', x.partner_handle,
          'partner_slug', x.partner_slug,
          'qualified_deposit_total', x.qualified_deposit_total,
          'cpa_paid_at', x.cpa_paid_at,
          'status', x.status,
          'risk_score', x.risk_score,
          'reasons', x.reasons,
          'notes', x.notes,
          'is_cpa_counted', x.is_cpa_counted,
          'reviewed_at', x.reviewed_at,
          'reviewed_by', x.reviewed_by,
          'created_at', x.created_at,
          'updated_at', x.updated_at
        )
        order by x.created_at desc
      )
      from (
      select
        f.id as flag_id,
        f.user_id,
        pu.handle as user_handle,
        pu.name as user_name,
        coalesce(f.partner_id, ur.partner_id) as partner_id,
        pp.handle as partner_handle,
        pa.slug as partner_slug,
        coalesce(ur.qualified_deposit_total, 0)::numeric as qualified_deposit_total,
        ur.cpa_paid_at,
        f.status,
        f.risk_score,
        f.reasons,
        f.notes,
        f.is_cpa_counted,
        f.reviewed_at,
        f.reviewed_by,
        f.created_at,
        f.updated_at
      from public.cpa_fraud_flags f
      join public.profiles pu on pu.id = f.user_id
      left join public.user_referrals ur on ur.user_id = f.user_id
      left join public.partner_accounts pa on pa.user_id = coalesce(f.partner_id, ur.partner_id)
      left join public.profiles pp on pp.id = pa.user_id
      where v_status is null or f.status = v_status
      order by f.created_at desc
      limit greatest(1, least(coalesce(p_limit, 200), 500))
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.admin_list_cpa_referrals(
  p_only_flagged boolean default false,
  p_limit int default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_admin();

  return coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'user_id', x.user_id,
          'user_handle', x.user_handle,
          'user_name', x.user_name,
          'partner_id', x.partner_id,
          'partner_handle', x.partner_handle,
          'partner_slug', x.partner_slug,
          'qualified_deposit_total', x.qualified_deposit_total,
          'cpa_paid_at', x.cpa_paid_at,
          'referred_at', x.referred_at,
          'flagged', x.flagged,
          'flag_status', x.flag_status,
          'flag_risk_score', x.flag_risk_score,
          'flag_reasons', x.flag_reasons,
          'cpf_last4', x.cpf_last4,
          'cpf_duplicate', x.cpf_duplicate
        )
        order by x.referred_at desc
      )
      from (
        select
          ur.user_id,
          pu.handle as user_handle,
          pu.name as user_name,
          ur.partner_id,
          pp.handle as partner_handle,
          pa.slug as partner_slug,
          coalesce(ur.qualified_deposit_total, 0)::numeric as qualified_deposit_total,
          ur.cpa_paid_at,
          ur.created_at as referred_at,
          (f.id is not null) as flagged,
          f.status as flag_status,
          f.risk_score as flag_risk_score,
          f.reasons as flag_reasons,
          upi.cpf_last4,
          exists (
            select 1
            from public.user_payment_identities o
            where o.cpf_hash = upi.cpf_hash
              and o.user_id <> ur.user_id
              and upi.cpf_hash is not null
          ) as cpf_duplicate
        from public.user_referrals ur
        join public.profiles pu on pu.id = ur.user_id
        join public.partner_accounts pa on pa.user_id = ur.partner_id
        join public.profiles pp on pp.id = pa.user_id
        left join public.cpa_fraud_flags f on f.user_id = ur.user_id
        left join public.user_payment_identities upi on upi.user_id = ur.user_id
        where not coalesce(p_only_flagged, false) or f.id is not null
        order by ur.created_at desc
        limit greatest(1, least(coalesce(p_limit, 200), 500))
      ) x
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.admin_list_cpa_fraud_cases(text, int) to authenticated;
grant execute on function public.admin_list_cpa_referrals(boolean, int) to authenticated;

notify pgrst, 'reload schema';
