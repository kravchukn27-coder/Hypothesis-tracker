# Bugs

---

## BUG-008 — Calendar drag/stage-change mutations fail silently

**Status:** TODO
**Priority:** HIGH
**Summary:** Dragging a week block (move/resize) or picking a new
stage on the Calendar grid gives no feedback if the underlying server
action fails — the UI just looks unchanged, with no way to tell
whether the edit landed.

**Description:** Source: `/impeccable critique` of `src/app/calendar/page.tsx`
(2026-08-09), P0 finding. `shiftExperimentWeeks`, `resizeExperimentWeeks`,
and `setExperimentWeekStage` (`ExperimentWeekRow.tsx`, ~lines 101-106)
are awaited inside `startTransition` with no `.catch`, no toast, and no
rollback of any optimistic UI state. If the server action throws
(network blip, stale record, constraint violation), the failure is
invisible to the user.

**Acceptance Criteria:**
- A failed drag-move, drag-resize, or stage-change surfaces a visible
  error (e.g. toast) to the user.
- Any optimistic/pending UI state is rolled back on failure so the
  grid doesn't show a stale or incorrect result.
- Successful mutations are unaffected — this only changes the failure
  path.

---

## BUG-009 — Experiments scheduled via raw start/end dates can't be dragged on the Calendar

**Status:** TODO
**Priority:** HIGH
**Summary:** Scheduling an undated experiment through the "Без дат"
row's date inputs (`DateCell.tsx`) makes it appear on the Calendar
grid, but it then can't be dragged or resized — the block just doesn't
move. Root cause confirmed in code: `updateExperimentDates`
(`src/app/experiments/actions.ts:323`) only ever writes
`Experiment.startDate`/`endDate`; it never creates `ExperimentWeekStage`
rows. `buildTimeline` (`src/lib/calendar.ts:146`) synthesizes
display-only week cells for such experiments on the fly ("nothing is
written back until the user actually edits a week" — see its own
comment), so the Calendar shows a bar with no real per-week rows behind
it. `shiftExperimentWeeks`/`resizeExperimentWeeks`
(`src/app/experiments/actions.ts:490`) read real `ExperimentWeekStage`
rows via `getBlockEntries` and silently `return` when none exist
(`if (entries.length === 0) return;`) — so any drag/resize on such a
block is a no-op with no error and no feedback.

**Description:** Source: user direction 2026-08-09. The user's own
working theory was that this was caused by picking a non-Monday start
date — worth noting that's *not* actually the cause: `buildTimeline`
normalizes every synthesized week to its Monday via `startOfWeek`
regardless of the exact day picked, so a mid-week start date isn't what
breaks dragging. The real cause is purely "no `ExperimentWeekStage` row
exists yet for this experiment" — happens for *any* experiment
scheduled solely through `DateCell`'s start/end inputs, Monday-aligned
or not. Fixing UI-022 (replacing that day-picker with a week-picker
that calls `setExperimentWeekStage` instead of
`updateExperimentDates`) would likely close this gap as a side effect
— but this is filed separately since the two have distinct acceptance
criteria and either could ship first.

**Acceptance Criteria:**
- An experiment scheduled via the "Без дат" row's date inputs is
  draggable/resizable on the Calendar immediately after being
  scheduled, same as an experiment scheduled via week-cell clicks.
- No behavior change for experiments already using real
  `ExperimentWeekStage` rows.
- If the fix is "always create real week rows when dates are set"
  rather than "remove the day-picker path entirely" (UI-022), a
  mid-week start date still resolves to a sensible Monday-aligned week
  entry, not a broken or off-by-one block.

---

None else open. See `docs/VERSIONS.md` for closed items.
