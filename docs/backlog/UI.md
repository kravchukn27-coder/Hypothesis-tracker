# UI Backlog

## UI-018 — Experiments list: Даты column is uninformative, needs redesign

**Status:** TODO
**Priority:** LOW
**Summary:** The Даты column on `/experiments` (raw start/end date
inputs via `DateCell`) reads poorly now and needs a different display
— not fully specified yet, needs a follow-up decision with the user.

**Description:** Source: user direction 2026-08-09. Current
`DateCell` (`src/app/experiments/DateCell.tsx`) renders a pair of
`<input type="date">` fields for `startDate`/`endDate`; for any
experiment with `ExperimentWeekStage` entries (the common case since
PROD-019 — see BUG-005) these are also `locked`/disabled, since the
dates are a derived cache from the week entries rather than directly
editable. The user finds this uninformative/awkward as a list-column
display and floated one direction — showing week name + week number
instead of raw dates — but said they'll firm up the actual design
themselves rather than locking it in now. **Do not start implementing
against the week-name/week-number idea until the user confirms the
direction** — this card exists to hold the "Даты column needs a
redesign" problem statement, not a committed spec.

**Acceptance Criteria:**
- TBD — needs a design decision from the user before acceptance
  criteria can be written. Revisit this card's scope before starting
  work.

---

## UI-019 — Experiment detail card: "Гипотеза" link too small/easy to miss

**Status:** TODO
**Priority:** LOW
**Summary:** On `/experiments/[id]`, the link back to the parent
hypothesis (labeled "Гипотеза") is small, plain-text — doesn't read as
clickable at a glance. Make it more prominent so it's obvious you can
click through to the hypothesis.

**Description:** Source: user direction 2026-08-09.
`ExperimentForm.tsx` (~line 119) renders it as `<span className="text-sm
font-medium text-zinc-700">Гипотеза</span>` label plus a
`<Link className="w-fit text-sm text-zinc-900 underline
underline-offset-4">{hypothesis.name}</Link>` — same small `text-sm`
as every other field value, easy to miss as a navigation link rather
than static text. Needs a visual treatment that reads as more
prominent/clickable (larger text, and/or a different visual weight
than a same-size underlined string) — exact treatment not specified
by the user, use judgment consistent with the rest of the detail card.

**Acceptance Criteria:**
- "Гипотеза" value on `/experiments/[id]` is visually larger/more
  prominent than the current plain `text-sm` underlined link, clearly
  reading as clickable navigation to the hypothesis.
- Still links to `/backlog/[hypothesisId]`, unchanged behavior.

---

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
