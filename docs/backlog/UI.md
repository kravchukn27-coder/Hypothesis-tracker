# UI Backlog

## UI-010 — Breadcrumb navigation on detail pages

**Status:** TODO
**Priority:** LOW
**Summary:** Replace the plain "← Backlog" / "← Experiments" text link
on detail pages with a real breadcrumb (e.g. "Backlog / Название
гипотезы"). Source: design research on GrowthBook/Statsig docs UI,
2026-08-06.

**Description:** Small, self-contained polish item — gives more
context about where the user is than a bare back-link, and matches
the pattern used throughout GrowthBook's and Statsig's own docs/app
navigation.

**Acceptance Criteria:**
- `/backlog/[id]` and `/experiments/[id]` show a breadcrumb (list name
  / current item name) instead of a plain "← Back" link.
