select cron.schedule(
  'reconcile-syncpay-payouts',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://project--93147d0e-ca4a-488f-abcf-0818612e1540.lovable.app/api/public/hooks/reconcile-syncpay-payouts',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6aGZmeGlpY3VmcWNhYm1oc2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjczNzUsImV4cCI6MjA5NDk0MzM3NX0.mZioGLaEUpRhsl0Hdkcj01GysdYA3nOhOMXj7msTMHA"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);