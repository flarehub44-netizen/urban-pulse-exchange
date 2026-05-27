-- CPA fraud governance v2:
-- - Mandatory admin action note for destructive bulk actions
-- - Confirmed fraud required for clear/suspend/delete
-- - Mandatory note when confirming a case as fraud

drop function if exists public.admin_clear_cpa_fraud_cases(boolean);
drop function if exists public.admin_suspend_cpa_fraud_partners(uuid);
drop function if exists public.admin_delete_cpa_fraud_users(boolean);

create or replace function public.assert_admin_action_note(p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_note is null or length(trim(p_note)) < 8 then
    raise exception 'action_note_required: informe um motivo com pelo menos 8 caracteres';
  end if;
end;
$$;

revoke execute on function public.assert_admin_action_note(text) from public;
grant execute on function public.assert_admin_action_note(text) to authenticated;

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
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
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

  if v_status = 'confirmed' then
    perform public.assert_admin_action_note(v_notes);
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
    v_notes,
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
      'reasons', coalesce(p_reasons, '[]'::jsonb),
      'notes', v_notes
    )
  );

  return jsonb_build_object('ok', true, 'user_id', p_user_id, 'status', v_status);
end;
$$;

create or replace function public.admin_clear_cpa_fraud_cases(
  p_action_note text,
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
  v_note text := trim(coalesce(p_action_note, ''));
begin
  perform public.assert_admin();
  perform public.assert_admin_action_note(v_note);

  if not coalesce(p_only_confirmed, true) then
    raise exception 'only_confirmed_required: ações destrutivas exigem status confirmed';
  end if;

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
    where f.status = 'confirmed'
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
        'cleared_by', auth.uid(),
        'action_note', v_note
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
          from coalesce(notes, '') || ' [CPA revertido: ' || v_note || ']'
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
      'only_confirmed', true,
      'action_note', v_note,
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
  p_action_note text,
  p_partner_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_note text := trim(coalesce(p_action_note, ''));
begin
  perform public.assert_admin();
  perform public.assert_admin_action_note(v_note);

  if p_partner_id is not null then
    if not exists (
      select 1
      from public.cpa_fraud_flags f
      where f.partner_id = p_partner_id
        and f.status = 'confirmed'
    ) then
      raise exception 'partner_has_no_confirmed_fraud';
    end if;

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
          and f.status = 'confirmed'
      );

    get diagnostics v_count = row_count;
  end if;

  insert into public.admin_actions (admin_id, action, target_type, target_id, payload)
  values (
    auth.uid(),
    'suspend_cpa_fraud_partners',
    'partner_accounts',
    coalesce(p_partner_id::text, '*'),
    jsonb_build_object('updated', v_count, 'action_note', v_note)
  );

  return jsonb_build_object('ok', true, 'updated_partners', v_count);
end;
$$;

create or replace function public.admin_delete_cpa_fraud_users(
  p_action_note text,
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
  v_note text := trim(coalesce(p_action_note, ''));
begin
  perform public.assert_admin();
  perform public.assert_admin_action_note(v_note);

  if not coalesce(p_only_confirmed, true) then
    raise exception 'only_confirmed_required: exclusão exige status confirmed';
  end if;

  select coalesce(array_agg(f.user_id), '{}'::uuid[])
    into v_ids
  from public.cpa_fraud_flags f
  where f.status = 'confirmed';

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return jsonb_build_object('ok', true, 'deleted_users', 0);
  end if;

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
      'only_confirmed', true,
      'action_note', v_note
    )
  );

  return jsonb_build_object('ok', true, 'deleted_users', v_count);
end;
$$;

do $$
begin
  if to_regprocedure('public.admin_clear_cpa_fraud_cases(boolean)') is not null then
    execute 'revoke execute on function public.admin_clear_cpa_fraud_cases(boolean) from authenticated';
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.admin_suspend_cpa_fraud_partners(uuid)') is not null then
    execute 'revoke execute on function public.admin_suspend_cpa_fraud_partners(uuid) from authenticated';
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.admin_delete_cpa_fraud_users(boolean)') is not null then
    execute 'revoke execute on function public.admin_delete_cpa_fraud_users(boolean) from authenticated';
  end if;
end;
$$;

grant execute on function public.admin_clear_cpa_fraud_cases(text, boolean) to authenticated;
grant execute on function public.admin_suspend_cpa_fraud_partners(text, uuid) to authenticated;
grant execute on function public.admin_delete_cpa_fraud_users(text, boolean) to authenticated;
