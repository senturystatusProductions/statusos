# StatusOS v3.5.1 — Focus Planner Cloud Sync

- Adds Supabase sync for Focus Planner entries and Pomodoro statistics.
- Syncs all dated Success OS records between desktop, Safari, and the iPhone Home Screen app.
- Pulls cloud changes on sign-in, reconnect, and app resume.
- Pushes edits automatically after a short debounce.
- Includes required database migration: `STATUSOS_FOCUS_PLANNER_SYNC_v3.5.1.sql`.
