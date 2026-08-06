# Product Backlog

## PROD-012 — Inline-editable dates on the Experiments list

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Let the user change an experiment's `startDate`/`endDate`
directly in the Experiments table row — no need to open the detail
page (`/experiments/[id]`) just to move a date.

**Description:** Source: user direction 2026-08-06, called out as
important. Mirrors the inline-edit pattern already shipped for Status
on this same list (PROD-009, `StageCell`): a small client component
per row (two `<input type="date">`s in place of the static "Даты"
text), calling a server action to update `Experiment.startDate`/
`endDate` immediately on change, with `router.refresh()` so the row
reflects the new value without a full page reload.

**Acceptance Criteria:**
- Experiments list "Даты" column shows editable start/end date inputs
  instead of static formatted text.
- Changing either date updates the experiment immediately, without
  navigating to `/experiments/[id]`.
- Calendar screen (`/calendar`), which reads the same
  `startDate`/`endDate` fields, reflects the change too (already true
  by construction — no calendar-specific work needed, just don't
  break it).
