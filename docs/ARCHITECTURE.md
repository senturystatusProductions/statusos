# Architecture

## Current data flow

UI → Task Engine → Storage Service → Local Cache → Sync Service → Supabase

Local storage remains the immediate source used by the interface. The sync service uploads queued changes and merges cloud records using `updated_at` timestamps.

## Public application API
- `StatusOS.Storage`
- `StatusOS.Sync`
- `StatusOS.Tasks`

UI modules should not communicate directly with Supabase.

## Foundation API (v0.7.5)

The global `StatusOS` registry now exposes:

- `StatusOS.Meta` for immutable build information.
- `StatusOS.Logger` for bounded local diagnostic events.
- `StatusOS.Diagnostics` for health collection and export.
- `StatusOS.Storage` for task cache and queue access.
- `StatusOS.Sync` for cloud synchronization.
- `StatusOS.Tasks` for Task Engine access.

Stable modules should register with this namespace rather than creating new unrelated globals.
