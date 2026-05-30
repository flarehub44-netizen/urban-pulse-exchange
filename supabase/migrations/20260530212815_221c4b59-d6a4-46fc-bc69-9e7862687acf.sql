CREATE OR REPLACE FUNCTION public.guard_profiles_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       or new.pnl is distinct from old.pnl then
      raise exception 'Cannot modify gamification stats directly';
    end if;
    if new.cpf is distinct from old.cpf then
      raise exception 'Cannot modify cpf directly; use update_profile_cpf RPC';
    end if;
    if new.phone is distinct from old.phone then
      raise exception 'Cannot modify phone directly; use update_profile_cpf RPC';
    end if;
  end if;
  return new;
end;
$$;