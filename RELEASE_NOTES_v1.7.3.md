# StatusOS v1.7.3 — Data Integrity & Sync Protection

## Added
- Automatic rolling workspace backups with the 10 most recent snapshots retained locally.
- Safety snapshots before cloud saves, cloud loads, realtime merges, imports, restores, and manual syncs.
- Restore Recent Backup control in the Profile menu.
- Artist OS-only JSON export and merge-safe import.
- Manual Sync Now control with a backup created before synchronization.
- Merge-safe artist imports that preserve existing records.

## Improved
- Artist records continue to merge by unique ID and latest `updatedAt` timestamp.
- Restoring a backup automatically protects the current workspace first.
- Offline cache bumped to v1.7.3.

## Database
No Supabase migration is required.
