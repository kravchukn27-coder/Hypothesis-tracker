---
target: Calendar surface
total_score: 20
max_score: 36
na_heuristics: 10
p0_count: 2
p1_count: 2
timestamp: 2026-08-09T15-30-44Z
slug: src-app-calendar-page-tsx
---
# Critique: Calendar (`src/app/calendar/page.tsx`)

Method: dual-agent (A: a5bf5701dc269c0ad · B: aa5f625f35a693720)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/pending feedback on stage changes or drag commits — `startTransition` + `router.refresh()` gives no spinner or optimistic pixel change. |
| 2 | Match System / Real World | 3 | Stage vocabulary and ISO week headers match how the team actually thinks in sprints. |
| 3 | User Control and Freedom | 1 | Stage-picker menu (`StageOptionsMenu.tsx:20`) only closes on `onMouseLeave` — no outside-click, no Escape. Verified stuck open across a filter-link navigation. |
| 4 | Consistency and Standards | 2 | The one dropdown-like affordance in the app doesn't close like a normal dropdown; draggable cells look identical to non-draggable pills with no affordance hint. |
| 5 | Error Prevention | 2 | Drag-move/resize commits on `pointerup` from any nonzero delta — no confirmation for a real reschedule. |
| 6 | Recognition Rather Than Recall | 3 | Icon + color + label on every cell is strong; stage-picker menu shows no current-selection indicator, forcing recall at the exact recognition moment. |
| 7 | Flexibility and Efficiency of Use | 3 (judged as internal tool) | Drag-to-move/resize and legend-as-filter are real efficiency wins; no keyboard shortcuts, acceptable trade for a small internal team. |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, appropriately dense for an ops dashboard; filler rows stabilize grid height. |
| 9 | Error Recovery | 1 | Mutating server actions (`shiftExperimentWeeks`, `resizeExperimentWeeks`, `setExperimentWeekStage`) have no `.catch`, no toast, no rollback — a failed drag fails silently. |
| 10 | Help and Documentation | n/a | Small internal team already knows the domain; not penalized. |
| **Total** | | **20/36** | **Acceptable (56%)** |

## Design Specificity Verdict

**LLM assessment**: Grounded, but only through interaction design, not visual language. The visual chrome (zinc-grey Tailwind defaults, rounded pill buttons, dashed empty state) is generic and could belong to any admin CRUD tool. What earns specificity is the mechanic layered on top: per-week stage cells that are clickable, draggable, and resizable; a legend that doubles as a live filter; the "Просрочен" sentinel; the "Без дат" drag-to-schedule flow. An unrelated product could reuse the paint job unchanged, but not the week-cell mechanic — that's real product thinking, appropriate for a project that has explicitly deferred visual polish in favor of mechanics.

**Deterministic scan**: `detect.mjs` static pass over the 4 source files returned clean (`[]`, exit 0). The live-DOM runtime detector (injected into the rendered `/calendar` page) found **5 anti-patterns**: 1 `nested-cards` (card inside card — unverified which elements, console output truncated) and repeated `text-occlusion` hits on `span.truncate` labels ("Discovery", "Experimentation") reported as 100% covered by an overlapping `button.block.w-full...hover:bg-zinc-100` element. That selector matches the stage-picker menu's option buttons — the same component Assessment A flagged (independently, via code reading) for missing a current-selection indicator and unreliable close behavior. The two assessments converge on the same component from different evidence: the LLM reviewer read the interaction logic and found it under-affianced; the detector read the live DOM and found the label text itself may be getting visually clipped/covered. Whether the occlusion is a real rendering bug or a false positive on "button wraps a truncated label" markup could not be resolved by the detector agent — worth a quick manual look at `StageOptionsMenu.tsx`'s button/span markup before writing it off.

**Visual overlays**: Browser injection succeeded but ran in a background live-server tab that was already torn down before this report — no overlay is currently visible in your browser. The console findings above are the full evidence captured.

## Overall Impression

The interaction model is the strongest thing about this screen — drag-to-move, drag-to-resize, and the legend-as-filter unification show real product thinking for a tool whose whole point is "the calendar is what actually happened this week." But the screen currently trusts that trust with almost no safety net: no confirmation or undo on a drag that reschedules real work, no error handling if a mutation fails, and one interactive menu that can get stuck open with no way to close it. The biggest opportunity is closing that gap between how confidently the UI lets you act and how little it tells you when something goes wrong.

## What's Working

1. **Icon + color + text label on every stage cell** (`STAGE_ICONS` + `STAGE_BAR_CLASSES` + `STAGE_LABELS`, `ExperimentWeekRow.tsx:141-144`) — fixes what would otherwise be a colorblind-hostile, memorize-the-palette interface.
2. **Legend-as-filter unification** (`stageFilterHref` in `page.tsx`) — reuses the always-visible legend as the filter control instead of adding a redundant dropdown, and dims (rather than removes) filtered-out cells so layout stays stable and data doesn't appear to vanish.
3. **`HideFromCalendarModal` on reaching "Done"** — a confirmation placed exactly where the stakes are highest (an experiment disappearing from the view), while leaving lower-stakes stage changes lightweight. Shows the team already knows how to triangulate where confirmation friction belongs — which makes its absence on drag (see P1 below) more notable.

## Priority Issues

**[P0] Stage-picker menu has no reliable close mechanism**
- **Why it matters**: `StageOptionsMenu.tsx:20` closes only via `onMouseLeave`. Verified live: it does not close on outside click, Escape, or a client-side navigation triggered by the legend filter — it can be left floating over freshly re-rendered, unrelated grid content indefinitely for anyone who clicks-and-jumps rather than glides the mouse away.
- **Fix**: Add a standard outside-click listener and an Escape-key handler; keep `onMouseLeave` as a bonus, not the only path.
- **Suggested command**: `/impeccable harden`

**[P0] Silent-failure drag/resize/stage-change with no error handling**
- **Why it matters**: `shiftExperimentWeeks`/`resizeExperimentWeeks`/`setExperimentWeekStage` (`ExperimentWeekRow.tsx:101-106`) are awaited inside `startTransition` with no `.catch`. If the server action throws, the drag appears to do nothing and the user can't tell whether their edit landed — a trust-breaking failure mode for a tool whose entire value is being the source of truth for the week.
- **Fix**: Wrap in try/catch, surface a toast on failure, roll back optimistic UI state.
- **Suggested command**: `/impeccable harden`

**[P1] No confirmation or undo on drag-move/drag-resize**
- **Why it matters**: A single accidental drag reschedules real, team-visible work with zero friction and zero undo, while the functionally similar "reaching Done" case already gets an explicit confirm modal. The inconsistency in where the team chose to add safety is the tell.
- **Fix**: At minimum, a toast with an undo action for ~5 seconds after any drag commits.
- **Suggested command**: `/impeccable harden`

**[P1] Mobile layout is broken, not just cramped**
- **Why it matters**: At 375px, the week-header row's column labels overlap into illegible text, and stage cells collapse to icon-only pills, losing the text-label recognition benefit that works well on desktop. `overflow-x-auto` is present but the inner grid isn't respecting minimum column width, so the intended scroll fallback doesn't visually trigger.
- **Fix**: Fix the grid's min-width sizing so columns get real minimum width before scroll kicks in; consider a tap-to-reveal label for stage cells on narrow viewports.
- **Suggested command**: `/impeccable adapt`

**[P2] Stage-picker menu shows no current-selection indicator, and its truncated labels may be visually occluded**
- **Why it matters**: The dropdown lists all 6 stages as undifferentiated buttons with no checkmark/highlight for the currently-set stage, forcing recall at the exact moment recognition should be possible. Separately, the live-DOM detector flagged the same buttons' `span.truncate` labels ("Discovery", "Experimentation") as 100% covered by the button element itself — possibly a false positive on button-wraps-label markup, but worth a manual check since it's the same component two independent checks both flagged.
- **Fix**: Highlight the current stage in the list; verify the truncated label span isn't actually clipped/hidden behind the button's own background in some state.
- **Suggested command**: `/impeccable clarify`

## Persona Red Flags

**Alex (Power User)**: Opens a cell's menu, realizes it's the wrong week, tries to dismiss by clicking anywhere else — the menu stays open (P0 above), forcing a pick or a hunt for the exact mouse-leave gesture that closes it. This is the single most power-user-hostile flaw on the page: it actively punishes fast, decisive interaction. Drags a block to fix a schedule slip with no confirmation and no toast, and has no way to verify the drag landed correctly without re-scanning the row.

**Sam (Accessibility-Dependent)**: The stage-picker's only close mechanism (`onMouseLeave`) is entirely mouse-dependent — a keyboard-only user has no Escape handler and no way to back out short of tabbing through all 6 stage buttons and beyond. Drag-to-move and drag-to-resize have no keyboard equivalent at all — Sam cannot reschedule or resize a block without a pointer, and is pushed onto a slower, per-week click-to-open-menu workflow that sighted/mouse users don't need. Filled-cell buttons carry a `title` but no `aria-expanded`/`aria-haspopup`, so a screen reader won't announce that clicking opens a menu or its open state.

**Casey (Distracted Mobile User)**: Opens Calendar on a phone to check status on the go and the header row is illegible — week labels overlap into unreadable text at 375px, confirmed via screenshot. Stage cells shrink to icon-only, dropping the text label that's core to at-a-glance recognition on desktop.

## Minor Observations

- "Сегодня" and both pager chevrons carry no loading indicator — same missing-status issue as stage edits, lower stakes.
- `Гипотеза:` subtitle text uses `text-zinc-400` on white — borderline low contrast for meaningful navigational text (it links to the parent hypothesis), not decorative.
- The resize handle is a bare 8px hit-target on a block's right edge (`ExperimentWeekRow.tsx:151`) with no visual affordance — undiscoverable without reading the code or triggering it by accident.
- `aria-disabled` is used on the "Сегодня" link when already on the current week (`page.tsx:120`), but it's still a real `<a href>` — doesn't reliably prevent activation for all assistive-tech/keyboard paths.
- Empty state ("Пока нет ни одного эксперимента") is clean with a clear CTA — checked, no issue.

## Questions to Consider

- If drag-to-move can silently fail or get accidentally triggered, why does it have less protection than reaching "Done"? The team already proved they know how to gate a high-stakes change with confirmation — what made drag feel safe enough to skip that treatment?
- Is the calendar the source of truth, or a view of one? The complete absence of error handling on every mutating action suggests an implicit assumption that server actions basically never fail — worth deciding explicitly rather than by omission.
- Who actually opens this on a phone, and does it matter? If never, the mobile bug is low priority; if sometimes, the current state is broken, not just unpolished.
