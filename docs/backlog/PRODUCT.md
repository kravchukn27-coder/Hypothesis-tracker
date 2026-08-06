# Product Backlog

## PROD-001 — Backlog screen: hypothesis list + create/edit

**Status:** TODO
**Priority:** HIGH
**Summary:** Build the first screen — list of hypotheses with
auto-computed Score, create/edit form, status changes.

**Description:** Port the `Backlog` sheet from the source spreadsheet
(see `docs/PROJECT_CONTEXT.md` → Origin Data Model) into a table +
form UI. Score is computed, never entered.

**Acceptance Criteria:**
- List view shows all hypotheses sortable by Score (desc by default).
- Create/edit form covers all `Hypothesis` fields from the schema.
- Funnel Level is a searchable/creatable select (existing tags + add
  new), not a fixed dropdown.
- Score updates live as Impact/Effort/Reach/Confidence change in the
  form, before saving.
- New hypothesis defaults to status `NEW`.
- Each hypothesis has a stable detail/edit route (e.g. `/backlog/[id]`)
  so PROD-002 can deep-link from an experiment to its parent
  hypothesis.

---

## PROD-002 — Experiments screen

**Status:** TODO
**Priority:** MEDIUM
**Summary:** List/create/edit experiments (status, author, targeting,
segment, dates, stage).

**Description:** Port the `График экспериментов` sheet's non-calendar
columns. Calendar rendering itself is PROD-003. Every experiment must
be created from an existing hypothesis (`hypothesisId` is required —
see `docs/PROJECT_CONTEXT.md`).

**Acceptance Criteria:**
- List view of experiments with status, author, targeting, segment.
- Create/edit form including `startDate`, `endDate`, `stage`.
- Creating an experiment requires picking its parent hypothesis (no
  orphan experiments).
- Experiment name in the list is a link that opens that experiment's
  parent hypothesis's Backlog card (PROD-001 detail/edit view).

---

## PROD-003 — Calendar screen

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Timeline view of experiments driven by dates/stage,
replacing the Excel week-column layout.

**Acceptance Criteria:**
- Experiments render on a real calendar/timeline by `startDate`/
  `endDate`.
- Stage is visually distinguishable (Discovery/Design/Development/
  Experimentation/Analysis).
- Changing an experiment's dates on this screen (or the Experiments
  screen) is reflected in both places.

---

## PROD-004 — Custom funnel-level tags & filters

**Status:** TODO
**Priority:** LOW
**Summary:** Let users add their own Funnel Level tags and filter the
Backlog/Experiments lists by them.
