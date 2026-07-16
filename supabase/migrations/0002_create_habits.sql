-- StatusOS v0.8.0 Habit Engine
create table if not exists public.habits (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  completed_date date,
  streak integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists habits_user_id_idx on public.habits(user_id);
alter table public.habits enable row level security;
drop policy if exists "Users can view their habits" on public.habits;
create policy "Users can view their habits" on public.habits for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their habits" on public.habits;
create policy "Users can insert their habits" on public.habits for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their habits" on public.habits;
create policy "Users can update their habits" on public.habits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their habits" on public.habits;
create policy "Users can delete their habits" on public.habits for delete using (auth.uid() = user_id);
