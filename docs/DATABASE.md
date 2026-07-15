# StatusOS Database Plan

## Existing Foundation

StatusOS currently stores application state in Supabase and supports realtime synchronization.

## Planned Tables

- `profiles`
- `artists`
- `contacts`
- `projects`
- `content_items`
- `sales_opportunities`
- `revenue_entries`
- `goals`
- `templates`
- `chat_conversations`
- `chat_messages`
- `memories`
- `activity_log`
- `system_logs`
- `user_settings`

## Required Columns for User-Owned Tables

- `id`
- `user_id`
- `created_at`
- `updated_at`

## Security

- Enable Row Level Security.
- Users may only read and modify rows where `user_id = auth.uid()`.
- Service-role access must remain server-side only.
- Edge Functions must validate the authenticated user before accessing private business data.

## Data Migration Principle

Do not split the current working state into many tables until the AI frontend connection is stable. Database normalization should happen in a dedicated release with backups and migration tests.
