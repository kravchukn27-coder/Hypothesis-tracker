# Product Backlog

---

---

---

## PROD-027 — New experiment: pick a starting week at creation time

**Status:** TODO
**Priority:** MEDIUM
**Summary:** `/experiments/new` has no week-scheduling step — the
per-week editor (`ExperimentWeekStagesEditor`) only renders once an
experiment already exists (`ExperimentForm.tsx:140`,
`{experimentId && <FormSection title="По неделям">...}`), so a new
experiment is created fully undated and always lands in the Calendar's
"Без дат" list first. Add a way to pick a starting week right at
creation — either from a list (e.g. next N weeks) or by clicking a week
on a small calendar preview — so the experiment can be scheduled in one
step instead of create-then-schedule-separately.

**Description:** Source: user direction 2026-08-09. The creation form's
"Расписание" section (`ExperimentForm.tsx:213`) currently only has raw
`type="date"` start/end inputs (see PROD-025/BUG-009 sibling cards for
why day-granularity dates are already a problem elsewhere in this
app) — and per `weekLocked` logic, those become irrelevant/locked the
moment real week entries exist anyway. The fix here should go straight
to week granularity: a new "starting week" field, offered either as a
list of upcoming weeks to pick from, or a small clickable week-grid
(same interaction as `WeekHeaderCell`'s click-to-assign, just scoped to
a preview rather than the full multi-experiment grid). On submit, this
should create the experiment already carrying a real
`ExperimentWeekStage` row for the chosen week (calling something
equivalent to `setExperimentWeekStage` post-create, or folding it into
`createExperiment` in `src/app/experiments/actions.ts`) — not just
setting `startDate`, which is exactly the gap BUG-009 describes for the
existing undated flow.

**Acceptance Criteria:**
- The creation form offers a week-granularity way to schedule the new
  experiment's first week (list-pick or calendar-click — exact
  interaction to be decided at implementation), replacing/supplementing
  the current raw date inputs.
- Choosing a week at creation results in a real `ExperimentWeekStage`
  row for that experiment (not just `startDate`/`endDate`), so it's
  immediately draggable/editable on the Calendar like any other
  week-tagged experiment.
- Skipping the field still works — creating without picking a week
  leaves the experiment undated, same as today.
