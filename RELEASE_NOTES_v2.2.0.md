# StatusOS v2.2.0 — Premium Polish Services

## Added
- Shared toast notification system for task sync, Artist OS sync, offline status, and app messages.
- Background cloud sync every 30 seconds while StatusOS is active.
- Automatic sync when the browser regains focus, returns from the background, or reconnects.
- Global command palette with `Ctrl + K` / `Cmd + K`.
- Command palette navigation for sections, artists, Add Artist, Add Task, and Sync Now.
- Subtle view transitions and button press feedback.

## Reliability
- No database migration required.
- Existing local-first behavior remains unchanged.
- Reduced-motion accessibility preference is respected.
- Service worker cache updated to v2.2.0.
