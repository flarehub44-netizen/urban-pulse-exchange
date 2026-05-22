-- Adds a pg_cron function that keeps regions table updated with realistic
-- São Paulo traffic patterns. The resolution oracle reads regions.flow,
-- avg_speed, and congestion; static values would make every snapshot identical.
--
-- Rush hours (7-9h, 17-20h BRT): high flow, low speed, high congestion.
-- Off-peak: moderate flow, fast speed, low congestion.
-- All values include ±noise to generate distinct oracle snapshots each tick.

create or replace function public.tick_region_simulator()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hour       int     := extract(hour from now() at time zone 'America/Sao_Paulo');
  v_rush       bool    := (v_hour between 7 and 9) or (v_hour between 17 and 20);
  v_flow_base  int     := case when v_rush then 5000 else 2200 end;
  v_speed_base numeric := case when v_rush then 18.0 else 48.0 end;
  v_cong_base  numeric := case when v_rush then 0.78 else 0.28 end;
begin
  update public.regions set
    flow       = v_flow_base + floor(random() * 800 - 400)::int,
    avg_speed  = greatest(8, v_speed_base + (random() * 12 - 6)),
    congestion = least(0.99, greatest(0.05, v_cong_base + (random() * 0.18 - 0.09))),
    updated_at = now();
end;
$$;

-- Grant execute to authenticated so health queries can call it if needed
grant execute on function public.tick_region_simulator() to service_role;

-- Schedule every 5 minutes alongside the lifecycle tick
select cron.schedule(
  'viax-region-sim',
  '*/5 * * * *',
  $$select public.tick_region_simulator()$$
);
