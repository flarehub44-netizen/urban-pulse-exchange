-- Football sync/resolve runs on Cloudflare Worker scheduled (wrangler.jsonc), not pg_cron.
-- Removes Lovable preview HTTP crons that pointed at *.lovable.app (404 / duplicate with Worker).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'football-sync') THEN
    PERFORM cron.unschedule('football-sync');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'football-resolve') THEN
    PERFORM cron.unschedule('football-resolve');
  END IF;
END $$;
