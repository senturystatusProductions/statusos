# StatusOS v2.7.0 — Artist CRM

## Added
- Expanded artist profiles with relationship strength, phone, website, location, tags, and tracked revenue.
- Pipeline stages including Returning Client.
- Artist KPI dashboard for revenue, beats sent, replies, open tasks, and linked projects.
- Connected task and project panels based on artist name.
- Payment and Project Started timeline activity types.
- Quick follow-up completion action.
- Improved mobile Artist CRM layout.

## Data safety
- Existing artist records and activity history are preserved.
- New CRM fields are backward-compatible and local-first.
- Existing Artist Repository backups, offline queue, and Supabase sync remain active.
- No SQL migration is required for this release. Core artist fields and activities continue cloud sync; expanded CRM fields remain protected in local/full StatusOS backups.
