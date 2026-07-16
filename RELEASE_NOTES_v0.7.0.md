# StatusOS v0.7.0 — Cloud Sync

## Added
- Local-first cloud task synchronization through Supabase.
- Automatic task loading after authentication.
- Offline change queue with automatic retry when the connection returns.
- Header sync indicator: Synced, Syncing, Pending, Offline, Local Only, or Cloud Setup Needed.
- Optional Supabase Realtime task refresh across signed-in devices.
- Central `StatusOS.Storage`, `StatusOS.Sync`, and `StatusOS.Tasks` APIs.
- Version-controlled task database migration with row-level security.
- Expanded product and engineering documentation.

## Compatibility
Tasks continue working locally if the database migration has not been installed or the device is offline. All Release 006 features remain available.

## Required cloud setup
Run `supabase/migrations/0001_create_tasks.sql` once in the Supabase SQL Editor to activate cross-device task sync.
