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

