-- StatusOS v1.2.1 Flexible Habit Goals
alter table public.habits add column if not exists period text not null default 'daily';
alter table public.habits add column if not exists target integer not null default 1;
alter table public.habits add column if not exists completion_dates jsonb not null default '[]'::jsonb;

update public.habits
set completion_dates = jsonb_build_array(completed_date::text)
where completed_date is not null and completion_dates = '[]'::jsonb;

alter table public.habits drop constraint if exists habits_period_check;
alter table public.habits add constraint habits_period_check check (period in ('daily','weekly','monthly'));
alter table public.habits drop constraint if exists habits_target_check;
alter table public.habits add constraint habits_target_check check (target >= 1 and target <= 31);
