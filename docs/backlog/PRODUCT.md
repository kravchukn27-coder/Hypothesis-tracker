# Product Backlog

## PROD-021 — Experiments list: sortable Segment column

**Status:** TODO
**Priority:** LOW
**Summary:** Add ascending/descending sort to the Segment column on
`/experiments`, matching the existing click-to-sort mechanism already
on Name/Status/Автор/Даты.

**Description:** Source: user direction 2026-08-09.
`src/app/experiments/page.tsx`'s Segment `<th>` (line ~211) is a plain
`<th>Segment</th>` — no `SortableHeader`, unlike every other column
header on this table. The in-memory sort in the same file (`sortBy ===
"name" | "stage" | "author" | "createdAt"`, else falls through to
`startDate`) needs a `"segment"` branch. `segments` is a many-to-many
relation (an experiment can have 0+ `Segment` tags, joined `", "` for
display) rather than a single scalar, so the comparator needs a
decision on what "sorting by segment" means for multi-value rows (e.g.
sort by the first/alphabetically-first segment name, or by the joined
display string) — same shape of question as `author` (`localeCompare`
on `""` for unset), but Segment can have more than one value where
Автор can't.

**Acceptance Criteria:**
- Segment column header is clickable and toggles asc/desc like the
  other sortable columns (`?sortBy=segment&dir=asc|desc`).
- Sort behavior for experiments with zero or multiple segments is
  well-defined and doesn't crash/misorder (empty segments sort
  consistently to one end, same convention as unset Автор).

---

## PROD-025 — Replace passive "Просрочен" highlight with an actionable in-app reminder

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Today the Calendar's "Просрочен" indicator
(`src/lib/calendar.ts:168`) is a passive flag: it just puts a red ring
on an experiment's last week-cell once `experiment.endDate`'s week is
in the past and `stage !== "DONE"`. This penalizes normal
continuation — e.g. Development running two weeks straight, with the
second week's entry just not created yet — as if it were neglect.
Replace it with a real trigger tied to the actual gap (last filled
`ExperimentWeekStage` row is in the past, current week has no entry at
all) and surface it as an actionable in-app banner, not just a red
ring, offering "mark this stage done" or "schedule the next stage".

**Description:** Source: user direction 2026-08-09, clarified via
follow-up questions (answers below). The app has no push/email
infrastructure or background scheduler — it's Next.js pages that
compute state on load — so "уведомление в начале следующей недели"
means: on page load (Calendar, and ideally anywhere the user lands
after a week boundary passes), check each active experiment for the
new gap condition and show an in-app banner if it applies. No new
infra (service worker, email digest) is in scope here.

**New trigger (replaces the old one):** an experiment is "overdue" when
its most recent `ExperimentWeekStage` entry's `weekStart` is before the
current week, and there is no entry for the current week. This
replaces the existing `endDate`-past check in `buildTimeline`
(`src/lib/calendar.ts:168`) — the red-ring `overdue` flag on
`TimelineRow`/`ExperimentWeekRow` should be driven by this same
gap-based check rather than `endDate`, so the Calendar's visual and the
new banner agree on one source of truth instead of two independent
"overdue" definitions.

**Banner and actions:** when the gap condition is true, show an in-app
banner (e.g. on `/calendar`, or wherever makes sense once designed) per
affected experiment, naming the experiment and its dangling last week,
offering two actions:
1. **"Завершить этап"** — marks that last week's entry as completed.
   This needs a new field on `ExperimentWeekStage` (e.g. `completed:
   Boolean @default(false)`) — separate from `stage` and separate from
   `Experiment.stage` (the overall experiment status) — so a week can
   be marked "this stage's run is done" without implying the whole
   experiment is `DONE`. Completed weeks should stop re-triggering the
   gap banner even though the next week is still unfilled.
2. **"Запланировать следующий этап"** — lets the user pick a stage and
   a date (defaulting to next week, but any date) to create the next
   `ExperimentWeekStage` entry, closing the gap directly from the
   banner instead of navigating to the detail card or Calendar cell.

**Open questions to settle during implementation** (not blocking this
card, but flagged so they aren't missed):
- Exact banner placement/persistence — one Calendar-page banner
  listing all gapped experiments, vs. per-experiment banners, vs.
  something on a dashboard/home if one exists.
- Whether a dismissed banner should reappear on the next visit or stay
  dismissed until the underlying gap is resolved.
- Whether "Запланировать следующий этап" should also support this
  inline, or just deep-link into the existing week editor
  (`ExperimentWeekStagesEditor`) with the target week pre-selected.

**Acceptance Criteria:**
- The gap-based overdue check (last filled week in the past, current
  week empty) replaces the `endDate`-based check as the single source
  of truth for both the Calendar's red-ring styling and the new
  banner.
- Continuing the same stage into a new week (i.e. filling in the
  current week before it lapses) never triggers the banner —
  normal continuation is not treated as overdue.
- The banner appears in-app (no push/email) when the user has a
  gapped experiment, and offers both "Завершить этап" and
  "Запланировать следующий этап" actions.
- "Завершить этап" persists a `completed` flag on that week's
  `ExperimentWeekStage` row (new schema field) without changing
  `Experiment.stage`, and a completed week no longer shows the banner
  for that gap.
- "Запланировать следующий этап" creates a new `ExperimentWeekStage`
  entry for the chosen stage/date and closes the gap (banner stops
  showing for that experiment once done).

---

## PROD-026 — Experiment detail card: "Показать на календаре" button

**Status:** TODO
**Priority:** LOW
**Summary:** Add a "Показать на календаре" button to the experiment
detail card (`src/app/experiments/[id]/page.tsx`) that opens `/calendar`
scrolled/positioned to that experiment's row, so you don't have to hunt
for it manually in the grid.

**Description:** Source: user direction 2026-08-09. Right now the only
route from a detail card to the Calendar is indirect (navigate to
`/calendar` and scan the rows yourself). `/calendar` already computes a
fixed weeks window per `buildTimeline`
(`src/lib/calendar.ts:132`, `windowStart` param) — the button needs a
way to tell the Calendar page which experiment/week to land on, e.g. an
`?experimentId=` query param that both scrolls the row into view and
(if the experiment's weeks fall outside the default window) shifts
`windowStart` so at least one of its weeks is visible. Needs a decision
on the "row not in default window" case specifically — jump the window
to the experiment's own start week, vs. just scroll/highlight if
already visible and no-op the window shift otherwise.

**Acceptance Criteria:**
- Experiment detail card shows a "Показать на календаре" button/link
  (only meaningful once the experiment has at least one scheduled
  week — hide or disable it for fully undated experiments, same
  condition as `buildTimeline`'s `undated` filter).
- Clicking it opens `/calendar` with that experiment's row visible
  (scrolled into view and/or window shifted so it's not empty/hidden).
- No effect on Calendar's existing filter/window behavior for other
  experiments.

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
