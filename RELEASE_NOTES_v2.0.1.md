# StatusOS v2.0.1

## Fixed

- Artist OS now initializes after authentication and immediately pulls the signed-in user’s artist records.
- Artist and activity changes now update other signed-in devices through Supabase Realtime.
- Returning to the app triggers a fresh Artist OS pull.
- Artist sync status now reports syncing, synced, or pending more accurately.
- The service worker now caches the Artist Repository and Recovery Center scripts and uses a new cache version.
- Productivity navigation starts collapsed after every page refresh.

No database migration is required.
