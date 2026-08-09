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
Needs an ISO (or otherwise well-defined) week-number calculation —
none exists yet in `src/lib/calendar.ts` (`formatWeekLabel` there is a
separate short day+month formatter for the Calendar grid headers, not
a week-number function). Decide once: which week-numbering convention
(ISO 8601 week-of-year is the common default) and whether the same
helper should also feed the Calendar screen for consistency, or stay
scoped to this one editor.

**Acceptance Criteria:**
- Each week row in the per-week editor shows its week number in
  parentheses after the existing date label.
- Week-numbering convention is consistent and documented (e.g. a
  comment noting it's ISO week-of-year) so it doesn't silently drift
  from whatever the Calendar screen does elsewhere.

---

## UI-021 — Calendar: show week number in the grid's week-column headers

**Status:** TODO
**Priority:** LOW
**Summary:** The Calendar grid's column headers (e.g. "03 авг", "10
авг", "17 авг") should also show the week number in parentheses — same
idea as UI-020, applied to the Calendar screen instead of the
experiment detail card's per-week editor.

**Description:** Source: user direction 2026-08-09.
`formatWeekLabel` (`src/lib/calendar.ts` ~line 24) formats each
`WeekHeaderCell` (`src/app/calendar/WeekHeaderCell.tsx`) label as
day+short-month only. Should reuse whatever week-numbering helper
UI-020 introduces (same ISO-week convention) rather than inventing a
second one — do these two together or make sure the second one reuses
the first's helper.

**Acceptance Criteria:**
- Each week-column header on `/calendar` shows its week number in
  parentheses alongside the existing date label.
- Uses the same week-numbering helper/convention as UI-020, not a
  separate implementation.

---
