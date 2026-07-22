-- StatusOS v3.5.1 Focus Planner Cloud Sync
create table if not exists public.statusos_success_os (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

alter table public.statusos_success_os enable row level security;

drop policy if exists "Users can read own success entries" on public.statusos_success_os;
create policy "Users can read own success entries"
on public.statusos_success_os for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own success entries" on public.statusos_success_os;
create policy "Users can insert own success entries"
on public.statusos_success_os for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own success entries" on public.statusos_success_os;
create policy "Users can update own success entries"
on public.statusos_success_os for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own success entries" on public.statusos_success_os;
create policy "Users can delete own success entries"
on public.statusos_success_os for delete
using (auth.uid() = user_id);

alter table public.statusos_success_os replica identity full;
