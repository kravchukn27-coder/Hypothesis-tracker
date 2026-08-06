# Product Backlog

## PROD-004 — Custom funnel-level tags, list filters & sorting

**Status:** TODO
**Priority:** LOW
**Summary:** Let users add their own Funnel Level tags, and filter/sort
the Backlog and Experiments lists. Right now Backlog is fixed-sorted
by Score desc and Experiments by start date, with no user-facing
filter or sort control on either.

**Description:** Funnel Level tags can already be created ad hoc via
the combobox on the Backlog form (see `docs/PROJECT_CONTEXT.md`); this
task is about *filtering* the lists by them, plus general list
filter/sort controls.

**Acceptance Criteria:**
- Backlog list: sort control (Score / Status / Name) and filter by
  Funnel Level and/or Status.
- Experiments list: filter by Status / Stage / Segment.
