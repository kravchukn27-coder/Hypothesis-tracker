# UI Backlog

## UI-001 — Backlog form: reorder Score, change Funnel Level to select+add

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Two layout/field-type fixes on the Backlog create/edit
form (`HypothesisForm`):
1. `Score` is pinned at the very top of the form, separate from the
   Impact/Effort/Reach/Confidence inputs that compute it — numbers in
   one place, result in another. Move it down next to those fields.
2. `Funnel Level` is currently a free-typing combobox (native
   `<datalist>`). Change it to work like `Status`: a select list of
   existing values, plus a way to add a new one — not a text field the
   user types into.

**Description:** Source: user direction 2026-08-06. Confirmed field
order otherwise: Name, then Hypothesis text — that part stays as is.

**Acceptance Criteria:**
- Score card sits directly with/near Impact, Effort, % Traffic
  (Reach), Confidence — not above Name/Hypothesis text.
- Funnel Level is a select of existing `FunnelLevel` values (like the
  Status dropdown), with an explicit "add new" option/action instead of
  free-typing into a combobox.
- Form field order otherwise unchanged: Name, Hypothesis text, then
  the rest.
