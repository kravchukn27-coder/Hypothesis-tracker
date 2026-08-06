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

---

## PROD-005 — Delete hypotheses and experiments

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Neither Backlog nor Experiments has a delete action today
— only create/edit. Needed to clean up test or mistaken entries.

**Description:** Add a delete action to both the Backlog and
Experiments screens. This is a destructive action, so needs a
confirmation step before it executes.

**Acceptance Criteria:**
- Delete action for a hypothesis (list and/or detail page), with a
  confirmation step.
- Delete action for an experiment (list and/or detail page), with a
  confirmation step.
- Open decision, needs the user's call before implementation: what
  happens when deleting a hypothesis that still has experiments?
  `Experiment.hypothesisId` is required — no orphan experiments are
  allowed (see `docs/PROJECT_CONTEXT.md`) — so either deletion is
  blocked while experiments still reference it, or deleting the
  hypothesis cascades and deletes its experiments too.
