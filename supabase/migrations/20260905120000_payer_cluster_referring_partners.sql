-- Link payer document clusters to referring creators (partners).

-- ---------------------------------------------------------------------------
-- Helper: referring partners for a payer cpf_hash cluster
-- ---------------------------------------------------------------------------
create or replace function public.payer_cluster_referring_partners(p_cpf_hash text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'partner_id', rp.partner_id,
        'partner_handle', rp.partner_handle,
        'partner_slug', rp.partner_slug,
        'linked_referral_count', rp.linked_referral_count
      )
      order by rp.linked_referral_count desc, rp.partner_handle nulls last
    ),
    '[]'::jsonb
  )
  from (
    select
      ur.partner_id,
      pp.handle as partner_handle,
      pa.slug as partner_slug,
      count(distinct ev.user_id)::int as linked_referral_count
    from public.payer_document_events ev
    join public.user_referrals ur on ur.user_id = ev.user_id
    join public.profiles pp on pp.id = ur.partner_id
    left join public.partner_accounts pa on pa.user_id = ur.partner_id
    where ev.cpf_hash = p_cpf_hash
      and ur.partner_id is not null
    group by ur.partner_id, pp.handle, pa.slug
  ) rp;
$$;

revoke execute on function public.payer_cluster_referring_partners(text) from public;
grant execute on function public.payer_cluster_referring_partners(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Heuristics: partner_shared_payer when same creator referred 2+ cluster accounts
-- ---------------------------------------------------------------------------
create or replace function public.evaluate_cpa_fraud_heuristics(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_referral_created timestamptz;
  v_ur public.user_referrals%rowtype;
  v_cpf_hash text;
  v_linked_count int;
  v_partner_cluster_count int;
  v_reasons text[] := '{}';
  v_score int := 55;
  v_minutes_to_qualify numeric;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'skipped', true);
  end if;

  if exists (
    select 1 from public.cpa_fraud_flags f
    where f.user_id = p_user_id and f.status in ('confirmed', 'cleared', 'resolved')
  ) then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'terminal_flag');
  end if;

  select * into v_ur from public.user_referrals where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', true, 'skipped', true, 'reason', 'not_referred');
  end if;

  v_partner_id := v_ur.partner_id;
  v_referral_created := v_ur.created_at;

  v_cpf_hash := public.resolve_user_payer_cpf_hash(p_user_id);
  v_linked_count := public.count_payer_linked_accounts(v_cpf_hash);

  if v_linked_count > 1 then
    v_reasons := array_append(v_reasons, 'duplicate_cpf');
    v_score := greatest(v_score, 85);
  end if;

  if v_cpf_hash is not null and v_partner_id is not null then
    select count(distinct ev.user_id)::int
      into v_partner_cluster_count
    from public.payer_document_events ev
    join public.user_referrals ur on ur.user_id = ev.user_id
    where ev.cpf_hash = v_cpf_hash
      and ur.partner_id = v_partner_id;

    if coalesce(v_partner_cluster_count, 0) >= 2 then
      v_reasons := array_append(v_reasons, 'partner_shared_payer');
      v_score := greatest(v_score, 90);
    end if;
  end if;

  if v_ur.qualified_deposit_total >= public.partner_setting_num('cpa_min_deposit_threshold', 50)
     and v_ur.cpa_paid_at is not null
     and v_referral_created is not null then
    v_minutes_to_qualify :=
      extract(epoch from (v_ur.cpa_paid_at - v_referral_created)) / 60.0;
    if v_minutes_to_qualify < 20 then
      v_reasons := array_append(v_reasons, 'fast_cpa_qualification');
      v_score := greatest(v_score, 70);
    end if;
  end if;

  if coalesce(array_length(v_reasons, 1), 0) = 0 then
    return jsonb_build_object(
      'ok', true,
      'flagged', false,
      'payer_linked_account_count', v_linked_count
    );
  end if;

  insert into public.cpa_fraud_flags (
    user_id, partner_id, status, risk_score, reasons, notes, updated_at
  )
  values (
    p_user_id,
    v_partner_id,
    'open',
    v_score,
    to_jsonb(v_reasons),
    'auto_heuristic',
    now()
  )
  on conflict (user_id) do update
  set
    partner_id = coalesce(excluded.partner_id, cpa_fraud_flags.partner_id),
    status = case
      when cpa_fraud_flags.status = 'confirmed' then cpa_fraud_flags.status
      else 'open'
    end,
    risk_score = greatest(cpa_fraud_flags.risk_score, excluded.risk_score),
    reasons = (
      select jsonb_agg(distinct elem)
      from jsonb_array_elements(
        coalesce(cpa_fraud_flags.reasons, '[]'::jsonb) || to_jsonb(v_reasons)
      ) elem
    ),
    notes = coalesce(cpa_fraud_flags.notes, excluded.notes),
    updated_at = now()
  where cpa_fraud_flags.status not in ('confirmed', 'cleared', 'resolved');

  return jsonb_build_object(
    'ok', true,
    'flagged', true,
    'reasons', to_jsonb(v_reasons),
    'risk_score', v_score,
    'payer_linked_account_count', v_linked_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin RPCs: partner per account + referring_partners aggregate
-- ---------------------------------------------------------------------------
create or replace function public.admin_payer_document_cluster(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_last4 text;
  v_doc_len smallint;
  v_count int;
  v_accounts jsonb;
  v_referring_partners jsonb;
begin
  perform public.assert_admin();

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'user_id_required');
  end if;

  v_hash := public.resolve_user_payer_cpf_hash(p_user_id);

  if v_hash is null then
    return jsonb_build_object(
      'ok', true,
      'cpf_hash', null,
      'document_last4', null,
      'document_length', null,
      'linked_account_count', 0,
      'referring_partners', '[]'::jsonb,
      'accounts', '[]'::jsonb
    );
  end if;

  select e.document_last4, e.document_length
    into v_last4, v_doc_len
  from public.payer_document_events e
  where e.cpf_hash = v_hash
  order by e.seen_at desc
  limit 1;

  v_last4 := coalesce(
    v_last4,
    (select upi.cpf_last4 from public.user_payment_identities upi where upi.user_id = p_user_id)
  );

  v_count := public.count_payer_linked_accounts(v_hash);
  v_referring_partners := public.payer_cluster_referring_partners(v_hash);

  select coalesce(jsonb_agg(row_to_json(t) order by t.first_seen_at), '[]'::jsonb)
    into v_accounts
  from (
    select
      p.id as user_id,
      p.handle as user_handle,
      p.name as user_name,
      p.created_at,
      p.kyc_status,
      p.balance,
      (p.banned_at is not null) as banned,
      min(e.seen_at) as first_seen_at,
      max(e.seen_at) as last_seen_at,
      ur.partner_id,
      pp_partner.handle as partner_handle,
      pa.slug as partner_slug,
      ur.created_at as referred_at
    from public.payer_document_events e
    join public.profiles p on p.id = e.user_id
    left join public.user_referrals ur on ur.user_id = p.id
    left join public.profiles pp_partner on pp_partner.id = ur.partner_id
    left join public.partner_accounts pa on pa.user_id = ur.partner_id
    where e.cpf_hash = v_hash
    group by
      p.id, p.handle, p.name, p.created_at, p.kyc_status, p.balance, p.banned_at,
      ur.partner_id, pp_partner.handle, pa.slug, ur.created_at
    order by min(e.seen_at)
  ) t;

  return jsonb_build_object(
    'ok', true,
    'cpf_hash', v_hash,
    'document_last4', v_last4,
    'document_length', v_doc_len,
    'linked_account_count', v_count,
    'referring_partners', v_referring_partners,
    'accounts', v_accounts
  );
end;
$$;

create or replace function public.admin_list_payer_document_clusters(
  p_min_accounts int default 2,
  p_limit int default 50
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
          'cpf_hash', c.cpf_hash,
          'document_last4', c.document_last4,
          'document_length', c.document_length,
          'account_count', c.account_count,
          'referring_partners', c.referring_partners,
          'accounts', c.accounts
        )
        order by c.account_count desc, c.last_seen_at desc
      )
      from (
        select
          e.cpf_hash,
          max(e.document_last4) as document_last4,
          max(e.document_length) as document_length,
          count(distinct e.user_id)::int as account_count,
          max(e.seen_at) as last_seen_at,
          public.payer_cluster_referring_partners(e.cpf_hash) as referring_partners,
          (
            select coalesce(jsonb_agg(row_to_json(a) order by a.first_seen_at), '[]'::jsonb)
            from (
              select
                p.id as user_id,
                p.handle as user_handle,
                p.name as user_name,
                (p.banned_at is not null) as banned,
                min(ev.seen_at) as first_seen_at,
                max(ev.seen_at) as last_seen_at,
                ur.partner_id,
                pp_partner.handle as partner_handle,
                pa.slug as partner_slug,
                ur.created_at as referred_at
              from public.payer_document_events ev
              join public.profiles p on p.id = ev.user_id
              left join public.user_referrals ur on ur.user_id = p.id
              left join public.profiles pp_partner on pp_partner.id = ur.partner_id
              left join public.partner_accounts pa on pa.user_id = ur.partner_id
              where ev.cpf_hash = e.cpf_hash
              group by
                p.id, p.handle, p.name, p.banned_at,
                ur.partner_id, pp_partner.handle, pa.slug, ur.created_at
            ) a
          ) as accounts
        from public.payer_document_events e
        group by e.cpf_hash
        having count(distinct e.user_id) >= greatest(2, coalesce(p_min_accounts, 2))
        order by count(distinct e.user_id) desc, max(e.seen_at) desc
        limit greatest(1, least(coalesce(p_limit, 50), 200))
      ) c
    ),
    '[]'::jsonb
  );
end;
$$;
