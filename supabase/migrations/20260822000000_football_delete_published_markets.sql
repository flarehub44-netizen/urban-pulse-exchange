-- Allow deleting published football markets without bets (not settled).

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
    raise exception 'Mercado não encontrado';
  end if;

  if v_market.status = 'settled' then
    raise exception 'Mercados liquidados não podem ser excluídos';
  end if;

  if exists (select 1 from public.football_bets b where b.market_id = p_market_id) then
    raise exception 'Não é possível excluir mercado com apostas — use Anular mercado';
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

notify pgrst, 'reload schema';
