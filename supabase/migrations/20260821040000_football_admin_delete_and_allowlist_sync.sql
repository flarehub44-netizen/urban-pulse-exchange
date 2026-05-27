create or replace function public.football_assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean;
begin
  if auth.uid() is null then
    raise exception 'Unauthorized';
  end if;

  -- Garantir que admins em allowlist sejam sincronizados antes da checagem.
  perform public.sync_admin_from_allowlist();

  select is_admin into v_admin from public.profiles where id = auth.uid();
  if not coalesce(v_admin, false) then
    raise exception 'Admin only';
  end if;
end;
$$;

create or replace function public.admin_delete_football_market(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market public.football_markets%rowtype;
begin
  perform public.football_assert_admin();

  select * into v_market
  from public.football_markets
  where id = p_market_id
  for update;

  if not found then
    raise exception 'Market not found';
  end if;

  if v_market.status <> 'draft' then
    raise exception 'Only draft markets can be deleted (status=%)', v_market.status;
  end if;

  if exists (select 1 from public.football_bets b where b.market_id = p_market_id) then
    raise exception 'Cannot delete market with bets';
  end if;

  delete from public.football_markets where id = p_market_id;

  update public.football_fixtures
  set review_status = 'pending_review',
      reviewed_by = null,
      reviewed_at = null,
      reject_reason = null
  where api_fixture_id = v_market.fixture_id;

  return jsonb_build_object(
    'market_id', p_market_id,
    'fixture_id', v_market.fixture_id,
    'deleted', true
  );
end;
$$;

grant execute on function public.admin_delete_football_market(text) to authenticated;
