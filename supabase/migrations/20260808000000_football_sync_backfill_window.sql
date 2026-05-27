-- Football sync window: configurable days back + days ahead.

insert into public.platform_settings (key, value)
values ('football_sync_days_back', '1'::jsonb)
on conflict (key) do nothing;

update public.platform_settings
set value = '1'::jsonb
where key = 'football_sync_days_ahead';
