# Active Backlog

Canonical home for open tasks. See `WORKFLOW.md` for rules.

- `PRODUCT.md` — features / screens
- `UI.md` — layout / UX issues
- `TECH.md` — architecture / data model / refactors
- `BUGS.md` — defects

## Current priority order (set 2026-08-06)

1. **BUG-001** (HIGH) — fixes broken/inconsistent behavior in a
   just-shipped flow.
2. **TECH-002** (HIGH) — merge Status/Stage before PROD-004 builds
   filtering on top of the two-field version.
3. **UI-001** (MEDIUM) — isolated form layout fix, no dependencies.
4. **PROD-005** (MEDIUM) — delete flow, independent.
5. **PROD-004** (LOW) — filters/sorting; do after TECH-002 so it
   filters on the merged field, not the old two-field split.

Update this order as tasks close or new ones get added — it's a
sequencing note, not a new backlog field, so keep it short.
