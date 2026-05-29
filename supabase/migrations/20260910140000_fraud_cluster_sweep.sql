-- Automated partner suspend when payer document clusters exceed threshold.

create or replace function public.service_fraud_cluster_sweep()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_min_accounts int;
  v_dry_run boolean;
  v_cluster record;
  v_partner record;
  v_suspended int := 0;
  v_flagged int := 0;
  v_clusters int := 0;
  v_rows int;
begin
  v_min_accounts := greatest(
    2,
    coalesce(public.partner_setting_num('fraud_cluster_min_accounts', 3)::int, 3)
  );
  v_dry_run := coalesce(
    (select (value #>> '{}')::boolean from public.platform_settings where key = 'fraud_cluster_sweep_dry_run'),
    true
  );

  for v_cluster in
    select e.cpf_hash, count(distinct e.user_id)::int as account_count
    from public.payer_document_events e
    where e.cpf_hash is not null
    group by e.cpf_hash
    having count(distinct e.user_id) >= v_min_accounts
  loop
    v_clusters := v_clusters + 1;

    for v_partner in
      select
        (rp->>'partner_id')::uuid as partner_id,
        coalesce((rp->>'linked_referral_count')::int, 0) as linked_referral_count
      from jsonb_array_elements(
        coalesce(public.payer_cluster_referring_partners(v_cluster.cpf_hash), '[]'::jsonb)
      ) rp
    loop
      if v_partner.linked_referral_count < v_min_accounts then
        continue;
      end if;

      if v_dry_run then
        continue;
      end if;

      insert into public.cpa_fraud_flags (
        user_id, partner_id, status, risk_score, reasons, notes, updated_at
      )
      select distinct
        ur.user_id,
        ur.partner_id,
        'confirmed',
        92,
        '["partner_shared_payer","auto_cluster_sweep"]'::jsonb,
        'auto_cluster_sweep',
        now()
      from public.user_referrals ur
      join public.payer_document_events ev on ev.user_id = ur.user_id
      where ev.cpf_hash = v_cluster.cpf_hash
        and ur.partner_id = v_partner.partner_id
      on conflict (user_id) do update
      set
        status = 'confirmed',
        partner_id = coalesce(excluded.partner_id, cpa_fraud_flags.partner_id),
        risk_score = greatest(cpa_fraud_flags.risk_score, excluded.risk_score),
        reasons = (
          select jsonb_agg(distinct elem)
          from jsonb_array_elements(
            coalesce(cpa_fraud_flags.reasons, '[]'::jsonb)
            || '["partner_shared_payer","auto_cluster_sweep"]'::jsonb
          ) elem
        ),
        notes = coalesce(cpa_fraud_flags.notes, '') || ' [auto_cluster_sweep]',
        updated_at = now()
      where cpa_fraud_flags.status not in ('cleared', 'resolved');

      get diagnostics v_rows = row_count;
      v_flagged := v_flagged + v_rows;

      update public.partner_accounts
      set status = 'suspended', updated_at = now()
      where user_id = v_partner.partner_id
        and status = 'active';

      get diagnostics v_rows = row_count;
      v_suspended := v_suspended + v_rows;
    end loop;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'dry_run', v_dry_run,
    'min_accounts', v_min_accounts,
    'clusters_seen', v_clusters,
    'partners_suspended', v_suspended,
    'referrals_flagged', v_flagged
  );
end;
$$;

revoke execute on function public.service_fraud_cluster_sweep() from public;
grant execute on function public.service_fraud_cluster_sweep() to service_role;
