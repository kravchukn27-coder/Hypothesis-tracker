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

## PROD-022 — Calendar: clickable stage legend filters the grid

**Status:** TODO
**Priority:** LOW
**Summary:** Turn the Calendar's stage legend (the row of colored dots
+ labels above the grid — Discovery/Design/Development/
Experimentation/Analysis/Done) into clickable filter buttons. Clicking
one (e.g. Analysis) filters the grid to only that stage's weeks/rows;
clicking again (or some reset) clears the filter.

**Description:** Source: user direction 2026-08-09.
`src/app/calendar/page.tsx` (~line 114) currently renders the legend
as static `Object.entries(STAGE_LABELS).map(...)` — colored dot + text,
no interaction. Needs: a URL-driven filter state (matching this app's
existing convention — see `docs/PROJECT_CONTEXT.md` → "List
filter/sort", `/backlog` and `/experiments` both filter via query
params, not client state), a decision on filter granularity (does
filtering a stage hide whole experiment rows that have no week in that
stage, or just grey out/hide the individual week-cells not matching?),
and a decision on how "Просрочен" (overdue) interacts with a stage
filter, since it's not itself a stage.

**Acceptance Criteria:**
- Clicking a stage in the legend filters the Calendar to show only
  that stage's weeks (exact show/hide behavior — whole row vs.
  individual cells — to be nailed down during implementation).
- The active filter is clear/reversible (visibly selected legend item,
  a way to get back to unfiltered).
- Filter state survives navigation the same way existing filters do
  (URL query param, per this app's established pattern).

---

## PROD-023 — Calendar: confirm before removing a week set to Done

**Status:** TODO
**Priority:** MEDIUM
**Summary:** When a week's stage is set to Done (via the per-week
editor or a Calendar week-cell), don't just silently drop it off the
Calendar — show a "убрать задачу из календаря?" (remove from
calendar?) Да/Нет prompt. Да → it disappears from the Calendar as
today. Нет → it stays visible on the Calendar with Done status
(currently: this state is unreachable, Done always disappears).

**Description:** Source: user direction 2026-08-09. **This revises
already-shipped behavior from PROD-015/PROD-018** — `calendar/page.tsx`
currently applies `where: { stage: { not: "DONE" } }` unconditionally
to the `prisma.experiment.findMany` query (added in PROD-018 2026-08-08,
confirmed explicitly per the user at the time: "tied to reaching DONE,
not archived — a Done experiment the user declines to archive should
still disappear from the Calendar"). This new request contradicts that
— it wants Done experiments to be *optionally* kept visible if the
user declines the prompt. **Needs confirming with the user that this
is an intentional reversal** before implementing, since it changes a
decision that was explicitly made two tasks ago. If confirmed: the
unconditional filter needs to become conditional on some new signal
(a per-experiment or per-week "hidden from calendar" flag, since
`archived` already means something else per PROD-018 and can't be
reused here), and the prompt needs a trigger point — presumably
wherever a week's stage becomes Done (`setExperimentWeekStage` in
`src/app/experiments/actions.ts`, called from both
`ExperimentWeekRow.tsx` and `ExperimentWeekStagesEditor.tsx`).

**Acceptance Criteria:**
- Confirmed with the user first: does this replace or coexist with
  PROD-018's unconditional Done-hides-from-Calendar behavior?
- Setting a week to Done triggers a "убрать задачу из календаря?"
  Да/Нет prompt.
- Да → behaves as today (disappears from Calendar).
- Нет → stays visible on the Calendar, shown with Done status/styling.
