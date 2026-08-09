# Bugs

## BUG-005 — Experiments list: Status pill completely unclickable

**Status:** TODO
**Priority:** MEDIUM
**Summary:** On `/experiments`, the Status pill in every row is
unclickable — it doesn't respond at all, no dropdown opens.

**Description:** Source: user report 2026-08-09. Likely not a new
regression but a pre-existing design decision (PROD-019) that now
reads as broken: `StageCell` (`src/app/experiments/StageCell.tsx`)
disables its `IconSelect` when `locked` is true —
`disabled={pending || locked}`, with `locked={e._count.weekStages > 0}`
passed from `src/app/experiments/page.tsx`. PROD-019 made inline
Status editing intentionally read-only once an experiment has any
per-week stage entries (edit via the Calendar's week-cells or the
detail card's per-week editor instead). Every experiment currently in
the dev DB has at least one `ExperimentWeekStage` row (confirmed
2026-08-08 during PROD-018 verification), so every row is locked —
which likely makes it *look* like the feature stopped working
entirely, even though each individual cell is behaving as designed.
Needs confirming with the user before treating this as "fix the lock
logic" vs. "the lock is fine, but give it a clearer locked affordance"
(currently just `disabled` + a title tooltip, easy to miss — no visual
cue that explains *why* it's unclickable without hovering).

**Acceptance Criteria:**
- Confirm with the user whether the intended fix is (a) inline Status
  editing should work again even for week-tracked experiments, or (b)
  the locked state should stay read-only but be visibly obvious as
  "locked, edit elsewhere" rather than a silently dead control.
- Whichever direction: a user looking at `/experiments` can tell at a
  glance why a Status pill isn't responding, without needing to hover
  for a tooltip.
