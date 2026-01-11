-- T-Rex Runner leaderboard schema (read-only for public clients).
-- Run this in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

-- Table
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

create index if not exists scores_score_created_at_idx
  on public.scores (score desc, created_at asc);

-- RLS: enable and remove any write policies.
alter table public.scores enable row level security;
alter table public.scores force row level security;

do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'scores'
  loop
    execute format('drop policy if exists %I on public.scores', pol.policyname);
  end loop;
end $$;

create policy "Public read scores"
  on public.scores
  for select
  to anon, authenticated
  using (true);

-- Privileges: explicitly allow read and revoke writes for common API roles.
revoke all on table public.scores from anon, authenticated;
grant select on table public.scores to anon, authenticated;
