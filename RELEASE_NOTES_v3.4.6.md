# StatusOS v3.4.6 — Habit Sync ID Repair

- Replaces the UUID-only habit cloud table with `statusos_habits_v2` using text IDs.
- Supports legacy habits and habits created on devices where UUID generation was unavailable.
- Updates realtime subscriptions to the repaired table.
- Preserves local habits and uploads them after the migration is installed.
- Updates the service-worker cache to force phones to load the repaired sync code.
