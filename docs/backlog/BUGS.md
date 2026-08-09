# Bugs

## BUG-007 — Calendar stage-picker menu has no reliable close mechanism

**Status:** TODO
**Priority:** HIGH
**Summary:** On the Calendar grid, the stage-picker menu (opened by
clicking a week cell) only closes via `onMouseLeave` — no outside-click
handler, no Escape key. Verified it stays open across a filter-link
navigation, leaving it floating over unrelated re-rendered grid
content.

**Description:** Source: `/impeccable critique` of `src/app/calendar/page.tsx`
(2026-08-09), P0 finding. `StageOptionsMenu.tsx` (~line 20) closes the
menu only through `onMouseLeave={onClose}`. Confirmed live: clicking
outside the menu, pressing Escape, and navigating via a legend filter
link all leave the same menu instance visible and interactive on
screen. Worst for keyboard-only/trackpad users, who have no reliable
way to dismiss it at all short of an unrelated re-render happening to
unmount it.

**Acceptance Criteria:**
- Clicking anywhere outside the open `StageOptionsMenu` closes it.
- Pressing Escape while the menu is open closes it.
- The menu no longer persists across a client-side navigation
  triggered while it's open.
- Existing `onMouseLeave` close behavior is preserved as an additional
  path, not removed.

---

## BUG-008 — Calendar drag/stage-change mutations fail silently

**Status:** TODO
**Priority:** HIGH
**Summary:** Dragging a week block (move/resize) or picking a new
stage on the Calendar grid gives no feedback if the underlying server
action fails — the UI just looks unchanged, with no way to tell
whether the edit landed.

**Description:** Source: `/impeccable critique` of `src/app/calendar/page.tsx`
(2026-08-09), P0 finding. `shiftExperimentWeeks`, `resizeExperimentWeeks`,
and `setExperimentWeekStage` (`ExperimentWeekRow.tsx`, ~lines 101-106)
are awaited inside `startTransition` with no `.catch`, no toast, and no
rollback of any optimistic UI state. If the server action throws
(network blip, stale record, constraint violation), the failure is
invisible to the user.

**Acceptance Criteria:**
- A failed drag-move, drag-resize, or stage-change surfaces a visible
  error (e.g. toast) to the user.
- Any optimistic/pending UI state is rolled back on failure so the
  grid doesn't show a stale or incorrect result.
- Successful mutations are unaffected — this only changes the failure
  path.

---

None else open. See `docs/VERSIONS.md` for closed items.
