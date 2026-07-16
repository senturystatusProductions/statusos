# StatusOS v0.7.5 — Foundation

Released: 2026-07-16
Status: Stable candidate

## Added

- Central application metadata through `StatusOS.Meta`.
- Diagnostic event logging through `StatusOS.Logger`.
- Runtime health collection through `StatusOS.Diagnostics`.
- Developer Console with build, connection, authentication, sync, task, queue, service-worker, cache, and storage information.
- Safe maintenance controls for exporting diagnostics, clearing diagnostic logs, and clearing application caches.
- Visible version label in the sidebar.
- Updated offline cache for the Foundation release.

## Preserved

- Authentication and Supabase configuration.
- Cloud task synchronization across devices.
- Offline task queue and automatic retry.
- Mission Control and Task Engine.
- AI Command Center and Daily Reset.
- Existing CRM, content, sales, project, revenue, goal, backup, and mobile functionality.

## Notes

This release intentionally avoids a risky rewrite of stable modules. It adds a foundation layer around the working application so future engines can register with the `StatusOS.*` internal API safely.
