-- StatusOS v3.4.3 Cross-Device Sync Repair
-- Run once in Supabase SQL Editor.

create table if not exists public.statusos_sync_tombstones (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('task','habit')),
  entity_id uuid not null,
  deleted_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

alter table public.statusos_sync_tombstones enable row level security;

drop policy if exists "Users manage their own StatusOS tombstones" on public.statusos_sync_tombstones;
create policy "Users manage their own StatusOS tombstones"
on public.statusos_sync_tombstones
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists statusos_sync_tombstones_user_type_idx
on public.statusos_sync_tombstones (user_id, entity_type, deleted_at desc);

-- Realtime is optional but recommended. Ignore duplicate publication errors.
do $$
begin
  alter publication supabase_realtime add table public.statusos_sync_tombstones;
exception when duplicate_object then null;
end $$;
