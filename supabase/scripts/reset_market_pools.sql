-- Zera pools fictícios (seed / demo) sem apostas reais.
-- Executar após purge_mock_data.sql ou sozinho no SQL Editor (service_role).
--
-- Regra: só zera mercados abertos SEM entries/positions (evita quebrar parimutuel real).
-- Mercados com apostas reais precisam liquidação/void admin, não este script.

begin;

-- ---------------------------------------------------------------------------
-- Mercados urbanos (SIM/NÃO)
-- ---------------------------------------------------------------------------
update public.markets m
set
  pool_yes = 0,
  pool_no = 0,
  participants = 0,
  trend = 0,
  updated_at = now()
where m.status not in ('settled', 'void')
  and (m.pool_yes <> 0 or m.pool_no <> 0 or m.participants <> 0)
  and not exists (select 1 from public.entries e where e.market_id = m.id)
  and not exists (select 1 from public.positions p where p.market_id = m.id)
  and (
    m.id like '%-live'
    or m.id like 'backup-%'
    or m.id in (
      'paulista-rush', 'marginal-tietê', 'faria-lima', '23-maio',
      'rebouças', 'anhangabaú', 'imigrantes', 'brigadeiro',
      'cm-demoevent0001', 'cm-demoevent0002', 'cm-demoevent0003'
    )
  );

-- Qualquer mercado aberto sem movimento (inclui comunidade recém-criada sem apostas)
update public.markets m
set
  pool_yes = 0,
  pool_no = 0,
  participants = 0,
  trend = 0,
  updated_at = now()
where m.status in ('live', 'closing', 'upcoming')
  and (m.pool_yes + m.pool_no) > 0
  and not exists (select 1 from public.entries e where e.market_id = m.id)
  and not exists (select 1 from public.positions p where p.market_id = m.id);

delete from public.market_history mh
where mh.market_id in (
  select m.id from public.markets m
  where m.pool_yes = 0 and m.pool_no = 0
    and not exists (select 1 from public.entries e where e.market_id = m.id)
);

-- ---------------------------------------------------------------------------
-- Futebol 1X2 (mantém fb-999999001 / fb-999999003 para testes se tiverem entries)
-- ---------------------------------------------------------------------------
update public.football_markets fm
set
  pool_home = 0,
  pool_draw = 0,
  pool_away = 0,
  participants = 0,
  updated_at = now()
where fm.status not in ('settled', 'void')
  and (coalesce(fm.pool_home, 0) + coalesce(fm.pool_draw, 0) + coalesce(fm.pool_away, 0)) > 0
  and not exists (select 1 from public.football_entries fe where fe.market_id = fm.id)
  and not exists (select 1 from public.football_positions fp where fp.market_id = fm.id)
  and (
    fm.fixture_id >= 999999000
    or fm.id in ('fb-999999002', 'fb-999999004', 'fb-999999005')
  );

-- Fixtures de teste sem apostas: pools zerados (não apaga a fixture)
update public.football_markets fm
set
  pool_home = 0,
  pool_draw = 0,
  pool_away = 0,
  participants = 0,
  updated_at = now()
where fm.id in ('fb-999999001', 'fb-999999003')
  and fm.status not in ('settled', 'void')
  and not exists (select 1 from public.football_entries fe where fe.market_id = fm.id)
  and not exists (select 1 from public.football_positions fp where fp.market_id = fm.id);

commit;
