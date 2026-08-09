# Product Backlog

## PROD-020 — Hypothesis detail card: add a way to create another experiment

**Status:** TODO
**Priority:** LOW
**Summary:** On `/backlog/[id]`, once a hypothesis already has an
experiment, its only action button is "Показать эксперимент" — there's
no way to start a second experiment off the same hypothesis from the
detail card, even though the app already supports multiple experiments
per hypothesis (PROD-006). Add a small secondary "Добавить
эксперимент" button next to "Показать эксперимент" (not replacing it).

**Description:** Source: user direction 2026-08-09.
`src/app/backlog/[id]/page.tsx` currently renders one of two mutually
exclusive buttons based on `hypothesis._count.experiments > 0`:
"Показать эксперимент" (links to `/experiments?hypothesisId=...`) or
"Создать эксперимент" (links to `/experiments/new?hypothesisId=...`).
Once the count is `> 0`, the create path becomes unreachable from this
card — the only way to add a second experiment today is via
`/experiments/new?hypothesisId=...` typed/linked manually, which isn't
exposed anywhere once the first experiment exists. `PROD-006`'s naming
scheme (hypothesis name + " N" suffix for the Nth+1 experiment) and
`computeExperimentName` already assume this is a supported flow — the
UI entry point is just missing. Per the user, this is a secondary
action, so it should read as visually lighter/smaller than "Показать
эксперимент", not equally prominent.

**Acceptance Criteria:**
- When a hypothesis has one or more experiments, `/backlog/[id]` shows
  both "Показать эксперимент" and a smaller "Добавить эксперимент"
  button (linking to `/experiments/new?hypothesisId=...`, same as
  today's zero-experiments "Создать эксперимент" path).
- "Добавить эксперимент" is visually secondary (smaller/lighter) next
  to "Показать эксперимент".
- Zero-experiments state is unchanged (still just "Создать
  эксперимент").

---

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

