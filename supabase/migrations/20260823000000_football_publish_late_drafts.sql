-- Allow publishing draft markets after kickoff; open bets only if betting window still valid.

create or replace function public.admin_publish_football_market(p_market_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_m public.football_markets%rowtype;
  v_f public.football_fixtures%rowtype;
  v_bets_open boolean;
  v_status public.market_status;
begin
  perform public.football_assert_admin();

  select * into v_m from public.football_markets where id = p_market_id for update;
  if not found then
    raise exception 'Mercado não encontrado';
  end if;
  if v_m.status <> 'draft' then
    raise exception 'Mercado precisa estar em rascunho (status=%)', v_m.status;
  end if;

  select * into v_f from public.football_fixtures where api_fixture_id = v_m.fixture_id;
  if v_f.review_status <> 'approved' then
    raise exception 'Jogo não aprovado';
  end if;

  v_bets_open := now() < v_m.betting_closes_at;
  v_status := case when v_bets_open then 'live'::public.market_status else 'closed'::public.market_status end;

  update public.football_markets
  set status = v_status,
      accept_bets = v_bets_open,
      updated_at = now()
  where id = p_market_id;

  return jsonb_build_object(
    'market_id', p_market_id,
    'status', v_status,
    'accept_bets', v_bets_open,
    'betting_window_open', v_bets_open
  );
end;
$$;

grant execute on function public.admin_publish_football_market(text) to authenticated;

notify pgrst, 'reload schema';
