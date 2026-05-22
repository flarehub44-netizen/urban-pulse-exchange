-- Tighten leagues visibility: members, creator, or explicitly public leagues.

alter table public.leagues add column if not exists is_public boolean not null default false;

drop policy if exists "leagues_select" on public.leagues;
create policy "leagues_select" on public.leagues
  for select using (
    is_public = true
    or created_by = auth.uid()
    or exists (
      select 1 from public.league_members lm
      where lm.league_id = leagues.id and lm.user_id = auth.uid()
    )
  );

drop policy if exists "league_members_select" on public.league_members;
create policy "league_members_select" on public.league_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.league_members lm2
      where lm2.league_id = league_members.league_id and lm2.user_id = auth.uid()
    )
    or exists (
      select 1 from public.leagues l
      where l.id = league_members.league_id
        and (l.is_public = true or l.created_by = auth.uid())
    )
  );
