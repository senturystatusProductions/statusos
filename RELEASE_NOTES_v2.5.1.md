# StatusOS v2.5.1 — Time & Display Polish

## Changed

- Planner times now display in 12-hour AM/PM format.
- Today / Day Plan times now display in 12-hour AM/PM format.
- Next Best Action time now uses the same format.
- Stored values remain in standard 24-hour format internally for sorting, editing, cloud sync, and database compatibility.
- Updated visible version metadata and service worker cache.

## Examples

- `13:00` displays as `1:00 PM`
- `14:30` displays as `2:30 PM`
- `00:15` displays as `12:15 AM`
- `12:00` displays as `12:00 PM`

No database migration is required.
