# Tech Backlog

## TECH-004 — Question: is the "Расписание" (start/end date) form section still needed?

**Status:** TODO
**Priority:** LOW
**Summary:** Open question, not a decided fix. On `/experiments/[id]`,
the "Расписание" section (Дата начала / Дата окончания) feels
vestigial now — figure out whether it should be removed, kept as a
read-only display, or still serves a real purpose.

**Description:** Source: user direction 2026-08-09. Per PROD-019
(`docs/PROJECT_CONTEXT.md` → Core Data Rules), `Experiment.startDate`/
`endDate` became a **derived cache** once an experiment has any
`ExperimentWeekStage` entries — recomputed automatically from the
week entries, not directly editable. `ExperimentForm.tsx`'s
"Расписание" section (~line 209) already disables both date inputs in
that case (`disabled={weekLocked}`, with a "Управляется по неделям"
tooltip) — so for any week-tracked experiment (the common case now,
see BUG-005) this whole section renders two disabled, redundant date
inputs that duplicate information already visible in the "По неделям"
editor above it. The only case where it's still live/useful is an
experiment with *no* week entries yet (dates set the old, PROD-006-era
way). Needs a decision: drop the section entirely once week entries
exist (relying on "По неделям" as the only source of truth), keep it
as plain read-only text instead of disabled inputs, or something else
— not just a styling call, since it touches which UI surface is
"the" place dates live.

**Acceptance Criteria:**
- Not yet defined — this card tracks the open question. Resolve the
  question with the user first, then either write real acceptance
  criteria or close this as WONTDO if the answer is "leave it".
