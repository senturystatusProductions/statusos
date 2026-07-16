-- StatusOS v0.9.0 Music OS
create table if not exists public.music_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  client text,
  project_type text not null default 'Other',
  status text not null default 'Idea',
  deadline date,
  priority text not null default 'Medium',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists music_projects_user_id_idx on public.music_projects(user_id);
create index if not exists music_projects_deadline_idx on public.music_projects(deadline);
alter table public.music_projects enable row level security;
drop policy if exists "Users can view their music projects" on public.music_projects;
create policy "Users can view their music projects" on public.music_projects for select using (auth.uid() = user_id);
drop policy if exists "Users can insert their music projects" on public.music_projects;
create policy "Users can insert their music projects" on public.music_projects for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update their music projects" on public.music_projects;
create policy "Users can update their music projects" on public.music_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete their music projects" on public.music_projects;
create policy "Users can delete their music projects" on public.music_projects for delete using (auth.uid() = user_id);
