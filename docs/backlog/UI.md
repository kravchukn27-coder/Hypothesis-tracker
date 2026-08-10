# UI Backlog

## UI-020 — Experiment detail card: show week number alongside the week-editor's date label

**Status:** TODO
**Priority:** LOW
**Summary:** In the "По неделям" per-week stage editor on
`/experiments/[id]`, each row is labeled "Неделя от {date}" (e.g.
"Неделя от 03 августа") — add the week number in parentheses, e.g.
"Неделя от 03 августа (32 неделя)". User says the section overall
works well, this is just an added data point.

**Description:** Source: user direction 2026-08-09.
`formatWeek` in `src/app/experiments/ExperimentWeekStagesEditor.tsx`
(~line 11) formats the label as day+month only
(`toLocaleDateString("ru-RU", { day: "2-digit", month: "long" })`).
UI-021 (done) added `getISOWeekNumber` to `src/lib/calendar.ts` —
ISO 8601 week-of-year, documented in its own comment — and uses it
for the Calendar grid headers. Reuse that helper here rather than
introducing a second one; `formatWeek` just needs `(${n} неделя)`
appended using it.

**Acceptance Criteria:**
- Each week row in the per-week editor shows its week number in
  parentheses after the existing date label.
- Uses `getISOWeekNumber` from `src/lib/calendar.ts` (the helper
  UI-021 introduced), not a separate implementation.

---

## UI-022 — Calendar's "Без дат" row still uses a day-granularity date picker

**Status:** TODO
**Priority:** MEDIUM
**Summary:** The Calendar's "Без дат" list (`UndatedRow.tsx`) offers
native `type="date"` day-pickers (`DateCell.tsx`) to schedule an
undated experiment — inconsistent with the rest of the app, which has
been week-granularity since PROD-019 (week-cell clicks, per-week
editor, week-range labels on the Experiments list per UI-018). Replace
these day inputs with a week picker, consistent with how scheduling
works everywhere else.

**Description:** Source: user direction 2026-08-09. `DateCell.tsx` is
now only used from `UndatedRow.tsx` (the Experiments list's own date
column was already replaced with a week-range label by UI-018) — so
this is a narrowly-scoped leftover of the pre-PROD-019 day-based model,
not a widely-used component. Closely related to BUG-009 (sibling
card): today, picking dates here calls `updateExperimentDates`, which
only sets `Experiment.startDate`/`endDate` and never creates a real
`ExperimentWeekStage` row — switching this control to a week picker
that calls `setExperimentWeekStage` directly (the same action
`WeekHeaderCell`'s drag-and-drop already uses) would fix both the
UX inconsistency and BUG-009's root cause in one move, rather than
being two independent fixes.

**Acceptance Criteria:**
- The "Без дат" row's scheduling control lets the user pick a week
  (not an arbitrary day) to place the experiment on the Calendar.
- Picking a week creates a real `ExperimentWeekStage` entry (so the
  experiment is immediately draggable, same as BUG-009 requires),
  not just `Experiment.startDate`/`endDate`.
- Existing drag-and-drop from the "Без дат" list onto a
  `WeekHeaderCell` (already working) is unaffected — this adds/replaces
  the manual-picker path, not the drag path.

---
