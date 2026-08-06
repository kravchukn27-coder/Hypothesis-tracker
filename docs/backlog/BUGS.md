# Bugs

## BUG-001 — "Convert to experiment?" prompt missing on the hypothesis detail page

**Status:** TODO
**Priority:** HIGH
**Summary:** The "Перевести в эксперимент?" prompt only fires from the
Backlog list's inline status dropdown (`StatusCell`). Changing status
via the full edit form on `/backlog/[id]` doesn't trigger it — same
underlying action (changing a hypothesis's status), inconsistent
result depending on which screen you did it from.

**Description:** Source: user direction 2026-08-06. Both places must
behave the same way. Also refines the trigger rule while fixing this:
the prompt should **not** fire when the new status is `HOLD` or `DONE`
(in addition to the existing `NEW` exclusion) — those are "not moving
forward right now" statuses, not "ready to test" ones.

**Acceptance Criteria:**
- Changing status on `/backlog/[id]`'s form triggers the same prompt
  as the Backlog list's inline dropdown, under the same conditions
  (hypothesis has zero experiments yet).
- Prompt does **not** fire when the new status is `NEW`, `HOLD`, or
  `DONE` — only for the "moving forward" statuses in between
  (`PLANNED`, `IN_PROGRESS`, `ACCEPTED`).
- Trigger logic lives in one shared place, not duplicated per screen,
  so this can't drift out of sync again.
