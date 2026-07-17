# StatusOS v1.7.1 — Artist OS Login Fix

## Fixed
- Removed leftover calls to the retired `renderCRM()` function.
- Artist search and status filters now use `StatusOS.ArtistOS.render()`.
- Login initialization no longer crashes with “renderCRM is not defined.”
- Updated the service-worker cache to force browsers to load the corrected files.

No Supabase migration is required.
