-- Remove dados de demonstração inseridos pelas migrations de seed.
-- Executar manualmente no SQL Editor (service_role) ou: psql -f supabase/scripts/purge_mock_data.sql
--
-- Mantém fixtures de teste: football api_fixture_id 999999001 e 999999003 (e2e / acceptance).
-- Não remove regiões do mapa (centro, paulista, …) — apenas conteúdo fictício ligado a demo.

begin;

-- Parar cron que recria mercados demo
do $$
declare
  r record;
begin
  for r in
    select jobid from cron.job
    where command ilike '%refresh_demo_live_markets%'
  loop
    perform cron.unschedule(r.jobid);
  end loop;
exception
  when undefined_table or undefined_function then
    null; -- pg_cron não instalado neste ambiente
end $$;

create temp table _mock_market_ids (id text primary key) on commit drop;
insert into _mock_market_ids (id) values
  ('paulista-rush'),
  ('paulista-rush-live'),
  ('marginal-tietê'),
  ('marginal-tiete-live'),
  ('faria-lima'),
  ('faria-lima-live'),
  ('23-maio'),
  ('rebouças'),
  ('reboucas-live'),
  ('anhangabaú'),
  ('imigrantes'),
  ('brigadeiro'),
  ('brigadeiro-live'),
  ('backup-paulista-live'),
  ('backup-marginal-live'),
  ('backup-pinheiros-live'),
  ('backup-reboucas-live'),
  ('backup-br116-live'),
  ('cm-demoevent0001'),
  ('cm-demoevent0002'),
  ('cm-demoevent0003');

-- Zerar pools demo antes de apagar (ignora settled/void — trigger guard_market_mutation)
update public.markets m
set pool_yes = 0, pool_no = 0, participants = 0, trend = 0, updated_at = now()
where m.id in (select id from _mock_market_ids)
  and m.status not in ('settled', 'void');

create temp table _mock_football_market_ids (id text primary key) on commit drop;
insert into _mock_football_market_ids (id) values
  ('fb-999999002'),
  ('fb-999999004'),
  ('fb-999999005');

create temp table _mock_profile_ids (id uuid primary key) on commit drop;
insert into _mock_profile_ids (id) values
  ('10000000-0000-0000-0000-000000000001'::uuid),
  ('10000000-0000-0000-0000-000000000002'::uuid),
  ('10000000-0000-0000-0000-000000000003'::uuid),
  ('10000000-0000-0000-0000-000000000004'::uuid),
  ('10000000-0000-0000-0000-000000000005'::uuid),
  ('10000000-0000-0000-0000-000000000006'::uuid),
  ('10000000-0000-0000-0000-000000000007'::uuid),
  ('10000000-0000-0000-0000-000000000008'::uuid),
  ('10000000-0000-0000-0000-000000000009'::uuid),
  ('10000000-0000-0000-0000-000000000010'::uuid);

-- Feed (demo traders)
delete from public.feed_likes
where post_id in (select id from public.feed_posts where user_id in (select id from _mock_profile_ids));

delete from public.feed_comments
where post_id in (select id from public.feed_posts where user_id in (select id from _mock_profile_ids));

delete from public.feed_posts where user_id in (select id from _mock_profile_ids);

-- Mercados urbanos demo (filhos antes do pai)
delete from public.market_access where market_id in (select id from _mock_market_ids);
delete from public.market_history where market_id in (select id from _mock_market_ids);
delete from public.market_resolution_rules where market_id in (select id from _mock_market_ids);

delete from public.entries where market_id in (select id from _mock_market_ids);
delete from public.positions where market_id in (select id from _mock_market_ids);

delete from public.markets where id in (select id from _mock_market_ids);

-- Futebol demo (exceto 001/003 usados em testes)
delete from public.football_entries where market_id in (select id from _mock_football_market_ids);
delete from public.football_positions where market_id in (select id from _mock_football_market_ids);
delete from public.football_markets where id in (select id from _mock_football_market_ids);
update public.football_markets fm
set pool_home = 0, pool_draw = 0, pool_away = 0, participants = 0, updated_at = now()
where fm.id in (select id from _mock_football_market_ids);

delete from public.football_fixtures
where api_fixture_id in (999999002, 999999004, 999999005);

-- Câmeras demo
delete from public.cameras where id like 'demo-cam-%';

-- Perfis demo (sem auth.users — seed com replication_role)
delete from public.notifications where user_id in (select id from _mock_profile_ids);
delete from public.transactions where user_id in (select id from _mock_profile_ids);
delete from public.profiles where id in (select id from _mock_profile_ids);

-- UrbanMind seed (opcional: descomente se não usar o perfil de IA fictício)
-- delete from public.profiles where id = '00000000-0000-0000-0000-000000000001';

-- Para zerar pools em mercados abertos que ficaram no banco: supabase/scripts/reset_market_pools.sql

commit;
