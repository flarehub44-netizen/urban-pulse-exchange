-- Realtime channel authorization (Supabase Security Advisor: realtime.messages RLS).
-- Topics must match src/hooks/* .channel(...) names. New channel = new policy.

alter table realtime.messages enable row level security;

drop policy if exists realtime_select_public_topics on realtime.messages;
create policy realtime_select_public_topics
  on realtime.messages
  for select
  to authenticated, anon
  using (
    realtime.topic() in (
      'markets-pool',
      'feed-live',
      'football-realtime',
      'markets-lifecycle'
    )
  );

drop policy if exists realtime_select_own_user_topics on realtime.messages;
create policy realtime_select_own_user_topics
  on realtime.messages
  for select
  to authenticated
  using (
    auth.uid() is not null
    and (
      realtime.topic() = 'notifications:' || auth.uid()::text
      or realtime.topic() = 'win-toast-' || auth.uid()::text
      or realtime.topic() = 'near-miss-' || auth.uid()::text
    )
  );

-- Deny broadcast/presence by default until explicitly needed.
drop policy if exists realtime_insert_deny_broadcast on realtime.messages;
create policy realtime_insert_deny_broadcast
  on realtime.messages
  for insert
  to authenticated, anon
  with check (false);
