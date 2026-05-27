-- Football sync behavior: require manual review by default.
insert into public.platform_settings (key, value)
values ('football_auto_approve', 'false'::jsonb)
on conflict (key) do nothing;

