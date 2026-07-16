# Architecture

## Current data flow

UI → Task Engine → Storage Service → Local Cache → Sync Service → Supabase

Local storage remains the immediate source used by the interface. The sync service uploads queued changes and merges cloud records using `updated_at` timestamps.

## Public application API
- `StatusOS.Storage`
- `StatusOS.Sync`
- `StatusOS.Tasks`

UI modules should not communicate directly with Supabase.
