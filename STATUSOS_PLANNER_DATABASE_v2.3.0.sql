create table if not exists public.planner_items (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  plan_date date not null,
  plan_time time,
  category text not null default 'Plan',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.planner_items enable row level security;
drop policy if exists "Users manage own planner items" on public.planner_items;
create policy "Users manage own planner items" on public.planner_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists planner_items_user_date_idx on public.planner_items(user_id, plan_date);
alter publication supabase_realtime add table public.planner_items;
