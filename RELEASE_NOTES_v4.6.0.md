# StatusOS v4.6.0 — Knowledge Engine Foundation

## Added
- Central Knowledge Timeline stored in `statusos_knowledge_timeline_v1`
- One event format for artists, projects, tasks, payments, and notes
- Duplicate-safe migration from existing StatusOS data
- Entity-linked history for future artist and project AI advisors
- `StatusOS.Knowledge.record()`, `query()`, and `contextFor()` APIs
- Timeline search, filters, date ranges, and manual notes now use the central engine

## Compatibility
Existing project, artist, task, finance, and manual timeline data is preserved and imported automatically.
