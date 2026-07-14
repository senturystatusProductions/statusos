-- Enable Supabase Realtime for the StatusOS workspace table.
-- Run once in Supabase → SQL Editor.

alter publication supabase_realtime
add table public.statusos_workspaces;
