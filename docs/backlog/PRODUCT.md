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
