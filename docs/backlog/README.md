# Active Backlog

Canonical home for open tasks. See `WORKFLOW.md` for rules.

- `PRODUCT.md` — features / screens
- `UI.md` — layout / UX issues
- `TECH.md` — architecture / data model / refactors
- `BUGS.md` — defects

## Current priority order (updated 2026-08-06)

1. **PROD-010** (HIGH) — Experiments list click target reversal
   (name → experiment, not hypothesis). Foundational nav fix; PROD-011
   depends on it.
2. **PROD-011** (HIGH) — Backlog row action jumps to/highlights
   existing experiment(s) instead of always "create". Do after
   PROD-010, whose click-through behavior it relies on.
3. **PROD-009** (MEDIUM) — inline-editable Status on Experiments list;
   groups naturally with PROD-010/011 since all three touch the same
   list screen.
4. **PROD-006** (MEDIUM) — auto-name experiments after their
   hypothesis; changes the create-experiment form, has an open
   question (editable after creation?) to resolve first.
5. **PROD-007** (MEDIUM) — clickable sortable column headers; bigger
   effort, open question about coexisting with the PROD-004 sort
   dropdown.
6. **UI-003** (LOW) — show hypothesis creation date; trivial, no
   dependencies.
7. **PROD-008** (LOW) — Автор filter on Experiments list; smallest,
   least urgent.

Update this order as tasks close or new ones get added — it's a
sequencing note, not a new backlog field, so keep it short.
