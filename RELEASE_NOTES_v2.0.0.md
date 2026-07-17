# StatusOS v2.0.0 – Database-First Artist OS

## Critical reliability change
Artist OS is no longer stored inside the whole-workspace `app_state` JSON. Each artist and activity is an independent Supabase record. An older phone workspace can no longer replace the desktop artist collection.

## Included
- Per-artist Supabase sync
- Local-first autosave and offline queue
- Dedicated Artist OS backup history
- Recovery Center
- Recycle Bin data model through `deleted_at`
- Version history table and trigger
- Safe legacy artist migration
- Artist import/export
- Visible Artist OS sync status

## Required
Run `SUPABASE_MIGRATION_v2.0.0.sql` once in Supabase SQL Editor.

## Rollback
Keep the original v1.7.3 ZIP. To roll back the code, redeploy v1.7.3. Do not delete the new Supabase tables; they preserve Artist OS records for recovery.
