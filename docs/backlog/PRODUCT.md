# Product Backlog

## PROD-015 — Calendar: stage icon on experiment bars

**Status:** TODO
**Priority:** LOW
**Summary:** Add the same stage icon used in `StageCell`/`IconSelect`
(`STAGE_ICONS` in `src/lib/experiment.ts`) to each colored experiment
bar on the Calendar grid, next to its label — currently color-only.

**Description:** Source: user direction 2026-08-07, part 2 of the
4-part Calendar overhaul. Small and independent of PROD-014/016/017 —
can be done in any order relative to them.

**Acceptance Criteria:**
- Each experiment bar on the Calendar shows its stage icon (same icon
  set as the Backlog/Experiments list pill-selects) alongside its
  existing color and label.

---

## PROD-018 — Archive hypotheses and experiments

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Add an "archived" concept for both Hypothesis and
Experiment, with four parts: (1) an Archive button on each detail
card; (2) a bulk-select mode on both list tables ("Изменить" toggles
row checkboxes, then Archive/Delete act on the selected set, each
behind a confirmation dialog); (3) an auto-prompt asking to archive
when a card's status/stage changes to Done; (4) Done-stage experiments
no longer show on the Calendar.

**Description:** Source: user direction 2026-08-07. `archived` is a
new concept — no existing field for it (`prisma/schema.prisma` needs
`archived`/`archivedAt` on both `Hypothesis` and `Experiment`). Reuse
existing patterns rather than inventing new ones:
- Confirmation dialogs — reuse `ConfirmDeleteButton`'s modal pattern
  (`src/components/ConfirmDeleteButton.tsx`) for both Archive and
  Delete confirmations, same "are you sure?" shape PROD-005 already
  established for delete.
- Bulk-select toolbar — new for both `src/app/backlog/page.tsx` and
  `src/app/experiments/page.tsx`: an "Изменить" button toggles a
  selection mode that adds a checkbox column to each row; while active,
  an action bar shows "Архивировать" and "Удалить", each gated by its
  own confirmation dialog before acting on all checked rows.
- Auto-prompt on reaching Done — mirrors BUG-001's existing
  "Перевести в эксперимент?" prompt mechanics
  (`shouldPromptExperimentConversion` in `src/lib/hypothesis.ts`,
  `ConvertToExperimentModal`, `ExperimentPromptGate`): when a
  hypothesis's status changes to `DONE` (inline `StatusCell` or the
  form), show "Хотите архивировать эту гипотезу? Да/Нет". Same for an
  experiment's stage changing to `DONE` (inline `StageCell` or the
  form) — "Хотите архивировать этот эксперимент?".
- Calendar exclusion — `src/app/calendar/page.tsx`'s
  `prisma.experiment.findMany` needs a `stage: { not: "DONE" }` filter
  (or equivalent) so Done experiments stop appearing in the grid. Per
  the user, this is tied to reaching `DONE`, not specifically to being
  archived — a Done experiment that the user declines to archive
  should still disappear from the Calendar.

**Needs a decision before implementing:** do archived hypotheses/
experiments still show in the normal `/backlog`/`/experiments` lists
(just visually marked as archived), or are they hidden from the
default list view entirely (with e.g. a filter toggle to show them,
similar to how GrowthBook lets you show/hide archived experiments)?
Not specified yet — confirm with the user, since it changes both the
list queries and whether a new filter UI is needed.

**Acceptance Criteria:**
- Both `/backlog/[id]` and `/experiments/[id]` have an Archive button,
  confirmation dialog before acting (same pattern as delete).
- Both `/backlog` and `/experiments` lists support: click "Изменить"
  → checkboxes appear on rows → select rows → "Архивировать" or
  "Удалить" acts on the selection, each behind its own confirmation
  dialog.
- Hypothesis status reaching `DONE` (inline or via the form) prompts
  "Хотите архивировать эту гипотезу?" (Да/Нет).
- Experiment stage reaching `DONE` (inline or via the form) prompts
  "Хотите архивировать этот эксперимент?" (Да/Нет).
- Experiments with stage `DONE` no longer appear on `/calendar`.

