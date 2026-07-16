# StatusOS v0.6.0 — Mission Control

## Added
- Mission Control replaces the Dashboard label throughout the main navigation.
- Live mission progress bar and completion percentage.
- Today’s Focus list showing the next five unfinished tasks.
- Quick mission statistics for completed, remaining, productivity, and total tasks.
- Mission Complete state when every current task is finished.
- Refined Task Engine with improved layout, Enter-to-add, clear-completed, and empty states.
- Live synchronization between Task Engine checkboxes and Mission Control.
- Responsive layouts for desktop and mobile.

## Preserved
- Login and Supabase authentication.
- StatusOS AI Command Center.
- Daily Reset.
- Existing business dashboard data, CRM, projects, sales, revenue, goals, templates, import/export, and PWA support.

## Storage
Task Engine data continues to use the existing local-storage key `statusos_tasks_v1`, preserving Release 005 tasks.
