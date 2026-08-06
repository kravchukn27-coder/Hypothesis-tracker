# Product Backlog

## PROD-006 — Auto-name experiments after their hypothesis

**Status:** TODO
**Priority:** MEDIUM
**Summary:** An experiment created from a hypothesis shouldn't get its
own manually-typed name — it should be named exactly after the
hypothesis. If a hypothesis already has one or more experiments, the
next one gets the hypothesis name with a number appended.

**Description:** Source: user direction 2026-08-06. Naming rule:
- First experiment for a hypothesis → name = hypothesis name, exactly
  (no suffix).
- Second experiment for the same hypothesis → hypothesis name + " 2".
  Third → + " 3", and so on — the number is based on how many
  experiments already exist for that hypothesis.

**Acceptance Criteria:**
- Creating an experiment from a hypothesis (`/experiments/new?hypothesisId=...`)
  no longer takes a free-typed name from the user — the name is
  derived automatically per the rule above.
- Name computed server-side at creation time (not just a form
  default), so it can't drift from the actual experiment count for
  that hypothesis.
- Open question, needs the user's call before implementation: is the
  computed name editable afterward on `/experiments/[id]` (e.g. if the
  user wants to distinguish two experiments with a more descriptive
  name later), or permanently locked to the auto-generated value?

---

## PROD-007 — Clickable sortable column headers on Backlog and Experiments tables

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Add click-to-sort column headers directly on the tables,
with an ascending/descending toggle indicator — not just the existing
"Сортировка" dropdown from PROD-004.
- Backlog table: Name, Status, Score columns become clickable headers.
- Experiments table: Name (Эксперимент), Status, Автор, Даты columns
  become clickable headers.

**Description:** Source: user direction 2026-08-06. Clicking a header
sorts by that column; clicking again flips direction (asc/desc), with
a visual indicator (e.g. an arrow) showing which column is active and
which direction. For Name: alphabetical. For Score: numeric low↔high.
For Status: presumably the existing status order
(`STATUS_ORDER`/`STAGE_ORDER`) forward or reversed. For Автор:
alphabetical. For Даты: by `startDate`.

**Open question, needs the user's call before implementation:** this
would sit alongside the "Сортировка" dropdown added in PROD-004 for
Backlog. Two controls driving the same underlying sort could get out
of sync or feel redundant — should the dropdown be removed/merged into
the column headers, or do both stay side by side (e.g. dropdown for
mobile/no-JS fallback, headers for the desktop table)?

**Acceptance Criteria:**
- Backlog: Name/Status/Score headers are clickable, each toggles
  asc/desc, current sort+direction is visually indicated.
- Experiments: Эксперимент(Name)/Status/Автор/Даты headers are
  clickable, same toggle behavior.
- Sort state reflected in the URL (consistent with PROD-004's
  query-param approach), so it stays shareable/bookmarkable.

---

## PROD-008 — Add Автор filter to Experiments list

**Status:** TODO
**Priority:** LOW
**Summary:** Experiments list currently filters by Status and Segment
(PROD-004) — add a third filter, by Автор (author).

**Description:** Source: user direction 2026-08-06. `Experiment.author`
is a free-text field, same shape as `segment` — follow the same
pattern PROD-004 already established for Segment: a `<select>` of
distinct existing author values in the data, not a free-text search
box.

**Acceptance Criteria:**
- Experiments list (`/experiments`) gets an Автор filter alongside the
  existing Status and Segment filters, same `FilterBar`/query-param
  mechanism (e.g. `?author=<value>`).
- Filter options are the distinct existing `author` values present in
  the data (consistent with how the Segment filter is built).

---

## PROD-009 — Inline-editable Status on the Experiments list

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Experiments list's Status column should be editable
inline, right in the row — same interaction as the Backlog list's
Status column, which doesn't require opening the detail page to
change status.

**Description:** Source: user direction 2026-08-06. Mirrors the
existing `StatusCell` pattern (`src/app/backlog/StatusCell.tsx`) built
for `Hypothesis.status`, applied to `Experiment.stage` (the merged
status/stage field from TECH-002) on `/experiments`. No "convert to
X" prompt logic applies here — that was specific to Hypothesis status
transitions, not relevant to Experiment stage.

**Acceptance Criteria:**
- `/experiments` Status column is an inline dropdown (colored
  badge-as-select, same visual/interaction pattern as Backlog's
  `StatusCell`), not just a static badge.
- Changing it updates `Experiment.stage` immediately, without
  navigating to `/experiments/[id]`.
