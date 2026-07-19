# StatusOS v2.8.1

## iPhone and Artist OS Reliability Fix

- Corrected the visible app version to v2.8.1.
- Updated the central StatusOS version constant and iPhone service-worker cache.
- Fixed Relationship Timeline deletions returning after cloud synchronization.
- Timeline deletions now create synchronized soft-delete records rather than only removing the local item.
- Deleted activity is hidden immediately and remains deleted across refreshes and devices.
- No SQL migration is required.
