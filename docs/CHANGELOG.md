# Changelog

All notable StatusOS changes are documented here.

## v0.2.3
- Added secure OpenAI backend architecture.
- Stored `OPENAI_API_KEY` as a Supabase secret.
- Deployed the `statusos-ai` Supabase Edge Function.

## v0.2.2
- Improved AI Assistant chat styling.
- Added message area, chat bubbles, input layout, and button styling.
- Commit: `3083bf3`

## v0.2.1
- Added AI Assistant navigation item.
- Added AI Assistant view with welcome message, input, and Send button.
- Added initial placeholder chat behavior.

## v0.2.0
- Repaired `app.js` and `index.html`.
- Restored authentication and app initialization.
- Confirmed working Supabase account creation and email confirmation.

## v0.7.5 — Foundation — 2026-07-16

### Added
- `StatusOS.Meta`, `StatusOS.Logger`, and `StatusOS.Diagnostics` internal APIs.
- Developer Console and safe maintenance controls.
- Build/version label and enhanced service-worker cache versioning.

### Changed
- Established a low-risk internal foundation without rewriting stable Cloud Sync modules.


## v0.8.0 - Habit Engine
- Added daily habits, streaks, daily score, Mission Control habit progress, local-first storage, and optional Supabase sync.


## v0.9.0 - Music OS
- Added cloud-ready Music OS production queue.
- Added project types, clients, statuses, deadlines, priorities, and notes.
- Added Mission Control music pipeline widget.
- Added Supabase migration 0003_create_music_projects.sql.
