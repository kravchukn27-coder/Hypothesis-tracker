# Bugs

## BUG-004 — Backlog table columns aren't actually fixed-width, so rendering is viewport-dependent

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Regression from UI-015 (new Funnel Level column on
`/backlog`). The table has no `table-fixed`, so the browser doesn't
respect the `tableWidths.ts` values as real widths — it proportionally
shrinks every column to fit whatever container width is available.
At a wide window this looks fine; at a narrower one (or a narrower
in-app preview pane), columns — especially Funnel Level — get
squeezed well below their intended width and the `Badge` inside wraps
onto multiple lines, looking broken. Columns must render at a
consistent, fixed width regardless of viewport, not reflow based on
available space.

**Description:** Source: user screenshots 2026-08-09, on `/backlog`.
Confirmed live (2026-08-09): at a 1280px window the table renders at
~975px with `Funnel Level` around 207px and no visible wrapping/scroll
— none of `NAME_COL`/`STATUS_COL`/`FUNNEL_LEVEL_COL`/etc.
(`src/components/tableWidths.ts`) are actually being honored as fixed
pixel widths; the `<table>` in `src/app/backlog/page.tsx` (and
`src/app/experiments/page.tsx`) has `w-full` with default
(non-`table-fixed`) layout, so the browser's auto table-layout
algorithm treats the Tailwind `w-*` classes as loose hints and
redistributes space to fit the container instead. That's why the
original bug report (badge wrapped 3 lines) doesn't reproduce at every
window size — it depends on how much the browser decides to shrink
each column at that particular width. The original "needs horizontal
scroll" framing was based on a wrong assumption (that unmet widths
would overflow); in practice they silently shrink instead, which is
arguably worse since it's inconsistent rather than a predictable
failure mode.

**Fix direction (per user, 2026-08-09):** make column widths a real,
enforced fix — e.g. `table-fixed` on both tables' `<table>` elements so
`tableWidths.ts`'s values are actually authoritative and every column
renders at the same width every time, independent of viewport or
content. This will likely require revisiting the UI-015 width math
(`FUNNEL_LEVEL_COL`/`COMMENT_COL` at `w-72` each, 1200px total) once
widths are truly fixed instead of auto-shrunk — at that point a
too-wide total *will* force real horizontal scroll (or clip, depending
on the wrapper), so the balance needs to be re-checked against an
actually-fixed layout, not just visually eyeballed at one window size.

**Acceptance Criteria:**
- Both `/backlog` and `/experiments` tables render every column at a
  single, fixed pixel width (per `tableWidths.ts`) regardless of
  viewport width or cell content — no proportional auto-shrinking.
- Funnel Level badges render as a single-line pill (existing `Badge`
  treatment) for all current funnel level values, including longer
  ones like "Новая воронка UI" and "Cancel Subscription" — no
  in-badge text wrapping, at any viewport.
- Rendering is verified at more than one window width (not just one
  comfortable size) before calling this fixed.

---

## BUG-005 — Experiments list: Status pill completely unclickable

**Status:** TODO
**Priority:** MEDIUM
**Summary:** On `/experiments`, the Status pill in every row is
unclickable — it doesn't respond at all, no dropdown opens.

**Description:** Source: user report 2026-08-09. Likely not a new
regression but a pre-existing design decision (PROD-019) that now
reads as broken: `StageCell` (`src/app/experiments/StageCell.tsx`)
disables its `IconSelect` when `locked` is true —
`disabled={pending || locked}`, with `locked={e._count.weekStages > 0}`
passed from `src/app/experiments/page.tsx`. PROD-019 made inline
Status editing intentionally read-only once an experiment has any
per-week stage entries (edit via the Calendar's week-cells or the
detail card's per-week editor instead). Every experiment currently in
the dev DB has at least one `ExperimentWeekStage` row (confirmed
2026-08-08 during PROD-018 verification), so every row is locked —
which likely makes it *look* like the feature stopped working
entirely, even though each individual cell is behaving as designed.
Needs confirming with the user before treating this as "fix the lock
logic" vs. "the lock is fine, but give it a clearer locked affordance"
(currently just `disabled` + a title tooltip, easy to miss — no visual
cue that explains *why* it's unclickable without hovering).

**Acceptance Criteria:**
- Confirm with the user whether the intended fix is (a) inline Status
  editing should work again even for week-tracked experiments, or (b)
  the locked state should stay read-only but be visibly obvious as
  "locked, edit elsewhere" rather than a silently dead control.
- Whichever direction: a user looking at `/experiments` can tell at a
  glance why a Status pill isn't responding, without needing to hover
  for a tooltip.
