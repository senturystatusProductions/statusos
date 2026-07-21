# StatusOS v3.4.0 — Daily Reliability

## Added
- Complete Backup & Reliability Center in Settings
- One-file export and restore for all StatusOS local data
- Automatic pre-restore safety snapshot
- Last saved, last backup, and pending-sync indicators
- Manual Sync Now control for tasks and Artist OS
- Duplicate artist protection using normalized artist names
- Duplicate artist timeline-entry protection
- Mobile-friendly reliability controls

## Data safety
This release does not seed or overwrite current user records. Backup export includes all localStorage records beginning with `statusos_`, including deletion records and current custom data.
