# StatusOS v4.6.2 — Timer Controller Conflict Hotfix

## Fixed

- Prevented the Focus timer and workout timer from writing to the same display at the same time.
- Added a shared timer ownership controller.
- Focus timer UI updates are ignored while a performance timer owns the display.
- Performance timer callbacks are ignored when their session is no longer active.
- Added generation protection for stale interval callbacks and delayed visual updates.
- Returning to Focus explicitly restores Focus ownership and redraws its clean state.
- Switching to Boxing, Kettlebell, Tabata, EMOM, HIIT, or Stopwatch fully stops and resets Focus first.

## Regression checks

- Focus running → Boxing
- Focus paused → Boxing
- Boxing → Focus
- Boxing → Kettlebell preset
- Repeated timer switching
- Page visibility changes while a workout timer is selected
