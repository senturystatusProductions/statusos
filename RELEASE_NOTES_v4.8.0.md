# StatusOS v4.8.0 - Context Engine

## Added
- Automatic artist detection from AI questions.
- Context packages containing artist profile, relationship intelligence, notes, projects, tasks, payments, and recent timeline activity.
- Producer DNA rules so outreach suggestions sound natural and match Sam's communication style.
- Context metadata sent with each AI request for future Edge Function upgrades.
- Visible thinking status when an artist history is being reviewed.

## Behaviour
- Asking "What should I say to Jesse?" now searches StatusOS for Jesse and sends his stored history to the AI.
- Missing information is identified instead of invented.

## Database
- No Supabase SQL changes are required.
