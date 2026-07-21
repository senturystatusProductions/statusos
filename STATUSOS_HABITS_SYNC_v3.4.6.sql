-- StatusOS v3.4.6 Habit Sync ID Repair
-- Run once in Supabase SQL Editor.
-- Uses TEXT habit IDs so both legacy and new StatusOS habits can sync.

create table if not exists public.statusos_habits_v2 (
  id text primary key,
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

create index if not exists statusos_habits_v2_user_updated_idx
on public.statusos_habits_v2 (user_id, updated_at desc);

alter table public.statusos_habits_v2 enable row level security;

drop policy if exists "Users manage their own StatusOS habits v2" on public.statusos_habits_v2;
create policy "Users manage their own StatusOS habits v2"
on public.statusos_habits_v2
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.statusos_habits_v2;
exception when duplicate_object then null;
end $$;
