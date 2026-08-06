# Active Backlog

Canonical home for open tasks. See `WORKFLOW.md` for rules.

- `PRODUCT.md` — features / screens
- `UI.md` — layout / UX issues
- `TECH.md` — architecture / data model / refactors
- `BUGS.md` — defects

## Current priority order (updated 2026-08-06)

Design pass, sourced from GrowthBook/Statsig research (2026-08-06),
plus a few earlier UI/product items still open:

1. **UI-008** (MEDIUM) — unify table visual style; builds on the
   shared `Badge` component (shipped via UI-011) for its status
   icon+color piece.
2. **UI-007** (MEDIUM) — Автор select+add + avatar display.
3. **UI-006** (MEDIUM) — "Показать эксперимент" label on the
   hypothesis detail card.
4. **UI-004** (MEDIUM) — toast notifications on save (needs a new
   toast system).
5. **UI-005** (LOW) — clickable/clearer truncated Comment.
6. **UI-010** (LOW) — breadcrumb navigation on detail pages.
7. **PROD-012** (MEDIUM) — inline-editable dates on Experiments list;
   a mechanics/feature item, not part of the design pass, can be done
   independently whenever.

`UI-011` (unified badge/tag system) and `UI-009` (sectioned detail
cards + shared Field/Input/Select components) shipped 2026-08-06 — see
`docs/VERSIONS.md`.

Update this order as tasks close or new ones get added — it's a
sequencing note, not a new backlog field, so keep it short.
