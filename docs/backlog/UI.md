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
