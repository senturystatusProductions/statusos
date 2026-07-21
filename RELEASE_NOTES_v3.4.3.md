# StatusOS v3.4.3 — Cross-Device Sync Repair

- Added shared cloud tombstones for task and habit deletions.
- Deleted tasks can no longer be recreated by another device's stale local cache.
- Added an offline sync queue for habit additions, progress changes, and deletions.
- Tasks and habits now merge using update timestamps while respecting deletions.
- Added realtime listening for task deletion tombstones.
- Updated the service-worker cache so phones receive the repaired sync code.

## Required Supabase step
Run `STATUSOS_SYNC_TOMBSTONES_v3.4.3.sql` once in the Supabase SQL Editor before testing cross-device sync.
