-- Zera os cards de /admin/finance (receita ledger, contagem, pools abertos).
-- Uso: staging/demo. Apaga histórico de platform_ledger — não rodar em produção com dinheiro real.
-- Executar no SQL Editor com service_role.

begin;

delete from public.platform_ledger;

update public.markets
set
  pool_yes = 0,
  pool_no = 0,
  participants = 0,
  trend = 0,
  updated_at = now()
where archived = false
  and status in ('live', 'closing', 'closed')
  and status not in ('settled', 'void');

update public.football_markets fm
set
  pool_home = 0,
  pool_draw = 0,
  pool_away = 0,
  participants = 0,
  updated_at = now()
where fm.status not in ('settled', 'void')
  and (coalesce(fm.pool_home, 0) + coalesce(fm.pool_draw, 0) + coalesce(fm.pool_away, 0)) > 0
  and not exists (select 1 from public.football_entries fe where fe.market_id = fm.id);

commit;
