# StatusOS v4.6.1 — Timer State Isolation Hotfix

## Fixed
- Switching from the Focus timer to Boxing, Kettlebell, HIIT, Tabata, EMOM, Stopwatch, or another workout timer now stops and resets the Focus timer first.
- Switching between workout timer modes now destroys the previous interval, timeout, audio, speech, phase, round, elapsed-time, and progress state before loading the next timer.
- Workout presets now load only after a successful mode switch.
- Added a confirmation before replacing an active or partially completed timer session.
- Returning to Focus mode now fully stops the workout timer.
- Prevented delayed halfway visual callbacks and speech from leaking into a newly selected timer.

## Test cases
- Focus → Boxing
- Focus → Kettlebell
- Boxing → Kettlebell
- Kettlebell → Focus
- Paused workout → another mode
- Active focus session → workout mode
