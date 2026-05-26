-- Supabase hosted: pg_cron/pg_net cannot ALTER EXTENSION SET SCHEMA (0A000).
-- Documented for Advisor 0014; new projects should install extensions into `extensions` at create time.

create schema if not exists extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;

comment on schema extensions is
  'Target schema for extensions on fresh installs. pg_cron/pg_net remain in public on this project (platform limit).';
