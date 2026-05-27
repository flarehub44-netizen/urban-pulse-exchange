-- Admin CPA fraud center:
-- - Tag suspicious referrals (admin-only)
-- - Keep CPA flowing by default (observation mode)
-- - Provide manual actions: clear CPA, suspend partner, delete users

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

  return coalesce((
    select jsonb_agg(jsonb_build_object(
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
    ) order by x.created_at desc), '[]'::jsonb)
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
  ), '[]'::jsonb);
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

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', x.user_id,
      'user_handle', x.user_handle,
      'user_name', x.user_name,
      'partner_id', x.partner_id,
      'partner_handle', x.partner_handle,
      'partner_slug', x.partner_slug,
      'qualified_deposit_total', x.qualified_deposit_total,
      'cpa_paid_at', x.cpa_paid_at,
      'flagged', x.flagged,
      'flag_status', x.flag_status,
      'risk_score', x.risk_score,
      'reasons', x.reasons
    ) order by x.cpa_paid_at desc nulls last), '[]'::jsonb)
    from (
      select
        ur.user_id,
        pu.handle as user_handle,
        pu.name as user_name,
        ur.partner_id,
        pp.handle as partner_handle,
        pa.slug as partner_slug,
        ur.qualified_deposit_total,
        ur.cpa_paid_at,
        (f.user_id is not null) as flagged,
        f.status as flag_status,
        f.risk_score,
        coalesce(f.reasons, '[]'::jsonb) as reasons
      from public.user_referrals ur
      join public.profiles pu on pu.id = ur.user_id
      join public.partner_accounts pa on pa.user_id = ur.partner_id
      left join public.profiles pp on pp.id = pa.user_id
      left join public.cpa_fraud_flags f on f.user_id = ur.user_id
      where ur.cpa_paid_at is not null
        and (not coalesce(p_only_flagged, false) or f.user_id is not null)
      order by ur.cpa_paid_at desc nulls last
      limit greatest(1, least(coalesce(p_limit, 200), 500))
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_tag_cpa_fraud_case(
  p_user_id uuid,
  p_partner_id uuid default null,
  p_status text default 'open',
  p_risk_score int default 60,
  p_reasons jsonb default '[]'::jsonb,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text := lower(trim(coalesce(p_status, 'open')));
  v_partner_id uuid := p_partner_id;
begin
  perform public.assert_admin();

  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if v_status not in ('open', 'confirmed', 'cleared', 'resolved') then
    raise exception 'invalid status';
  end if;
  if p_risk_score < 0 or p_risk_score > 100 then
    raise exception 'invalid risk score';
  end if;

  if v_partner_id is null then
    select ur.partner_id into v_partner_id
    from public.user_referrals ur
    where ur.user_id = p_user_id
    limit 1;
  end if;

  insert into public.cpa_fraud_flags (
    user_id, partner_id, status, risk_score, reasons, notes, reviewed_at, reviewed_by, updated_at
  )
  values (
    p_user_id,
    v_partner_id,
    v_status,
    p_risk_score,
    coalesce(p_reasons, '[]'::jsonb),
    nullif(trim(coalesce(p_notes, '')), ''),
    case when v_status in ('confirmed', 'cleared', 'resolved') then now() else null end,
    case when v_status in ('confirmed', 'cleared', 'resolved') then auth.uid() else null end,
    now()
  )
  on conflict (user_id) do update
  set
    partner_id = coalesce(excluded.partner_id, cpa_fraud_flags.partner_id),
    status = excluded.status,
    risk_score = excluded.risk_score,
    reasons = excluded.reasons,
    notes = excluded.notes,
    reviewed_at = case
      when excluded.status in ('confirmed', 'cleared', 'resolved') then now()
      else cpa_fraud_flags.reviewed_at
    end,
    reviewed_by = case
      when excluded.status in ('confirmed', 'cleared', 'resolved') then auth.uid()
      else cpa_fraud_flags.reviewed_by
    end,
    updated_at = now();

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'tag_cpa_fraud_case',
    'cpa_fraud_flags',
    p_user_id::text,
    jsonb_build_object(
      'partner_id', v_partner_id,
      'status', v_status,
      'risk_score', p_risk_score,
      'reasons', coalesce(p_reasons, '[]'::jsonb)
    )
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', v_status);
end;
$$;

create or replace function public.admin_clear_cpa_fraud_cases(
  p_only_confirmed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_reversed_count int := 0;
  v_reversed_total numeric := 0;
begin
  perform public.assert_admin();

  for v_row in
    select
      f.user_id,
      ur.partner_id,
      coalesce(sum(l.amount), 0)::numeric as cpa_amount
    from public.cpa_fraud_flags f
    join public.user_referrals ur on ur.user_id = f.user_id
    left join public.partner_commission_ledger l
      on l.partner_id = ur.partner_id
     and l.kind = 'cpa'
     and l.meta ->> 'referred_user_id' = f.user_id::text
    where
      f.status in ('open', 'confirmed')
      and (not coalesce(p_only_confirmed, true) or f.status = 'confirmed')
      and ur.cpa_paid_at is not null
    group by f.user_id, ur.partner_id
  loop
    if coalesce(v_row.cpa_amount, 0) <= 0 then
      continue;
    end if;

    insert into public.partner_commission_ledger (
      partner_id, amount, rake_base, referred_volume, kind, meta
    )
    values (
      v_row.partner_id,
      -abs(v_row.cpa_amount),
      0,
      0,
      'cpa_reversal',
      jsonb_build_object(
        'referred_user_id', v_row.user_id,
        'source', 'admin_clear_cpa_fraud_cases',
        'cleared_by', auth.uid()
      )
    );

    update public.partner_accounts
    set balance = greatest(0, coalesce(balance, 0) - abs(v_row.cpa_amount)),
        updated_at = now()
    where user_id = v_row.partner_id;

    update public.cpa_fraud_flags
    set status = 'resolved',
        is_cpa_counted = false,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        notes = trim(
          both ' '
          from coalesce(notes, '') || ' [CPA revertido manualmente em ' ||
          to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') || ']'
        ),
        updated_at = now()
    where user_id = v_row.user_id;

    v_reversed_count := v_reversed_count + 1;
    v_reversed_total := v_reversed_total + abs(v_row.cpa_amount);
  end loop;

  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (
    auth.uid(),
    'clear_cpa_fraud_cases',
    'partner_commission_ledger',
    jsonb_build_object(
      'only_confirmed', coalesce(p_only_confirmed, true),
      'cases', v_reversed_count,
      'total', v_reversed_total
    )
  );

  return jsonb_build_object(
    'ok', true,
    'reversed_cases', v_reversed_count,
    'reversed_total', coalesce(v_reversed_total, 0)
  );
end;
$$;

create or replace function public.admin_suspend_cpa_fraud_partners(
  p_partner_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  perform public.assert_admin();

  if p_partner_id is not null then
    update public.partner_accounts
    set status = 'suspended',
        updated_at = now()
    where user_id = p_partner_id
      and status <> 'suspended';

    get diagnostics v_count = row_count;
  else
    update public.partner_accounts pa
    set status = 'suspended',
        updated_at = now()
    where pa.status <> 'suspended'
      and exists (
        select 1
        from public.cpa_fraud_flags f
        where f.partner_id = pa.user_id
          and f.status in ('open', 'confirmed')
      );

    get diagnostics v_count = row_count;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'suspend_cpa_fraud_partners',
    'partner_accounts',
    coalesce(p_partner_id::text, '*'),
    jsonb_build_object('updated', v_count)
  );

  return jsonb_build_object('ok', true, 'updated_partners', v_count);
end;
$$;

create or replace function public.admin_delete_cpa_fraud_users(
  p_only_confirmed boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_count int := 0;
begin
  perform public.assert_admin();

  select coalesce(array_agg(f.user_id), '{}'::uuid[])
    into v_ids
  from public.cpa_fraud_flags f
  where f.status in ('open', 'confirmed')
    and (not coalesce(p_only_confirmed, true) or f.status = 'confirmed');

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'deleted_users', 0);
  end if;

  -- Removing profile cascades to user financial/social rows via FK.
  delete from public.profiles
  where id = any(v_ids);
  get diagnostics v_count = row_count;

  insert into public.admin_actions (admin_id, action, target_type, payload)
  values (
    auth.uid(),
    'delete_cpa_fraud_users',
    'profiles',
    jsonb_build_object(
      'deleted', v_count,
      'only_confirmed', coalesce(p_only_confirmed, true)
    )
  );

  return jsonb_build_object('ok', true, 'deleted_users', v_count);
end;
$$;

grant execute on function public.admin_list_cpa_fraud_cases(text, int) to authenticated;
grant execute on function public.admin_list_cpa_referrals(boolean, int) to authenticated;
grant execute on function public.admin_tag_cpa_fraud_case(uuid, uuid, text, int, jsonb, text) to authenticated;
grant execute on function public.admin_clear_cpa_fraud_cases(boolean) to authenticated;
grant execute on function public.admin_suspend_cpa_fraud_partners(uuid) to authenticated;
grant execute on function public.admin_delete_cpa_fraud_users(boolean) to authenticated;
