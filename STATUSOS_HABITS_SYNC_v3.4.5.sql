-- StatusOS v3.4.5 Habit Sync Recovery
-- Run once in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.statusos_habits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  period text not null default 'daily' check (period in ('daily','weekly','monthly','yearly')),
  target integer not null default 1 check (target >= 1),
  completion_dates jsonb not null default '[]'::jsonb,
  completed_date text,
  streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists statusos_habits_user_updated_idx
on public.statusos_habits (user_id, updated_at desc);

alter table public.statusos_habits enable row level security;

drop policy if exists "Users manage their own StatusOS habits" on public.statusos_habits;
create policy "Users manage their own StatusOS habits"
on public.statusos_habits
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.statusos_habits;
exception when duplicate_object then null;
end $$;
