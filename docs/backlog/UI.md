# UI Backlog

## UI-003 — Show hypothesis creation date on the detail card

**Status:** TODO
**Priority:** LOW
**Summary:** Show when a hypothesis was created, as read-only info on
`/backlog/[id]`.

**Description:** Source: user direction 2026-08-06. `Hypothesis.createdAt`
already exists in the schema and has been collected automatically
since the model was first created (`@default(now())`) — it has just
never been surfaced in the UI. This task is display-only: no schema or
data change needed. User's stated motivation: might want to sort/order
hypotheses by creation history later — that's not in scope here, just
noted as the reason the field matters.

**Acceptance Criteria:**
- `/backlog/[id]` shows the hypothesis's creation date, formatted
  human-readably, as read-only info (not an editable form field).
