# StatusOS v3.4.5 — Habit Sync Recovery

- Replaces the unreliable legacy habits cloud table with `statusos_habits`.
- Adds a complete Supabase schema and RLS policies for cross-device habit sync.
- Adds realtime habit updates between desktop and iPhone.
- Makes sync failures visible instead of silently failing.
- Preserves local habits and uploads them after the migration is installed.
- Keeps yearly habit targets and progress compatible.
