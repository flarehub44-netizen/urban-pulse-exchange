-- Security hardening: profile column guard, audit ledger restriction

-- ---------------------------------------------------------------------------
-- Block client updates to privileged profile columns (S1)
-- ---------------------------------------------------------------------------
create or replace function public.guard_profiles_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('role', true) = 'service_role' then
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
       or new.pnl is distinct from old.pnl then
      raise exception 'Cannot modify gamification stats directly';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive on public.profiles;
create trigger profiles_guard_sensitive
  before update on public.profiles
  for each row execute function public.guard_profiles_sensitive_columns();

-- ---------------------------------------------------------------------------
-- get_market_audit: ledger only for admins (S2)
-- ---------------------------------------------------------------------------
create or replace function public.get_market_audit(p_market_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_resolutions jsonb;
  v_ledger jsonb := '[]'::jsonb;
  v_snaps jsonb;
begin
  if v_uid is not null then
    select coalesce(is_admin, false) into v_admin
    from public.profiles where id = v_uid;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id, 'status', r.status, 'raw_value', r.raw_value,
      'derived_side', r.derived_side, 'confidence', r.confidence,
      'source', r.source, 'validation', r.validation,
      'payout_summary', r.payout_summary, 'created_at', r.created_at
    ) order by r.created_at desc
  ), '[]'::jsonb) into v_resolutions
  from public.market_resolutions r where r.market_id = p_market_id;

  if v_admin then
    select coalesce(jsonb_agg(
      jsonb_build_object('amount', l.amount, 'kind', l.kind, 'meta', l.meta, 'created_at', l.created_at)
      order by l.created_at desc
    ), '[]'::jsonb) into v_ledger
    from public.platform_ledger l where l.market_id = p_market_id;
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object('raw_value', s.raw_value, 'metric', s.metric, 'recorded_at', s.recorded_at)
    order by s.recorded_at desc
  ), '[]'::jsonb) into v_snaps
  from (
    select raw_value, metric, recorded_at
    from public.oracle_snapshots
    where market_id = p_market_id
    order by recorded_at desc
    limit 30
  ) s;

  return jsonb_build_object(
    'resolutions', v_resolutions,
    'ledger', v_ledger,
    'snapshots', v_snaps,
    'is_admin', v_admin
  );
end;
$$;

-- Ensure lifecycle tick is not callable by clients
revoke execute on function public.tick_market_lifecycle() from authenticated;
revoke execute on function public.tick_market_lifecycle() from anon;
revoke execute on function public.refresh_market_lifecycle() from authenticated;
revoke execute on function public.refresh_market_lifecycle() from anon;
