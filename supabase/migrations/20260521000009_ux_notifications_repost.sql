-- market_id on notifications for deep links
alter table public.notifications
  add column if not exists market_id text references public.markets(id) on delete set null;

-- resolve_market: include market_id in win notifications
create or replace function public.resolve_market(
  p_market_id   text,
  p_winning_side bet_side
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_market     markets%rowtype;
  v_prize      numeric;
  v_pool_win   numeric;
  v_bet        record;
  v_payout     numeric;
  v_paid       int := 0;
begin
  select * into v_market from public.markets where id = p_market_id for update;
  if not found then raise exception 'Market not found'; end if;
  if v_market.status = 'resolved' then raise exception 'Market already resolved'; end if;

  v_prize := (v_market.pool_yes + v_market.pool_no) * 0.9;
  if p_winning_side = 'YES' then v_pool_win := v_market.pool_yes; else v_pool_win := v_market.pool_no; end if;

  update public.markets
  set status = 'resolved', resolved = p_winning_side, updated_at = now()
  where id = p_market_id;

  if v_pool_win > 0 then
    for v_bet in
      select b.id, b.user_id, b.stake, b.share
      from public.bets b
      where b.market_id = p_market_id and b.side = p_winning_side and b.payout is null
    loop
      v_payout := round((v_bet.stake / v_pool_win) * v_prize, 2);
      update public.bets set payout = v_payout where id = v_bet.id;
      update public.profiles set balance = balance + v_payout, pnl = pnl + (v_payout - v_bet.stake) where id = v_bet.user_id;
      insert into public.transactions (user_id, type, market_id, market_label, amount)
      values (v_bet.user_id, 'payout', p_market_id, v_market.region, v_payout);
      insert into public.notifications (user_id, kind, text, market_id)
      values (v_bet.user_id, 'win', 'Payout de ' || v_payout::text || ' no mercado ' || v_market.region, p_market_id);
      v_paid := v_paid + 1;
    end loop;
  end if;

  return jsonb_build_object('market_id', p_market_id, 'winning_side', p_winning_side, 'payouts', v_paid);
end;
$$;

-- repost: increment counter and create visible derivative post
create or replace function public.repost_feed_post(p_post_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inserted int;
  v_reposts int;
  v_src public.feed_posts%rowtype;
  v_handle text;
  v_snippet text;
begin
  if v_uid is null then raise exception 'Unauthorized'; end if;

  select * into v_src from public.feed_posts where id = p_post_id;
  if not found then raise exception 'Post not found'; end if;

  select handle into v_handle from public.profiles where id = v_src.user_id;

  insert into public.feed_reposts (user_id, post_id) values (v_uid, p_post_id)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    update public.feed_posts set reposts = reposts + 1 where id = p_post_id returning reposts into v_reposts;

    v_snippet := left(v_src.text, 200);
    if length(v_src.text) > 200 then v_snippet := v_snippet || '…'; end if;

    insert into public.feed_posts (user_id, text, market_id, tag)
    values (
      v_uid,
      '🔁 @' || coalesce(v_handle, 'trader') || ': ' || v_snippet,
      v_src.market_id,
      v_src.tag
    );
  else
    select reposts into v_reposts from public.feed_posts where id = p_post_id;
  end if;

  return coalesce(v_reposts, 0);
end;
$$;
