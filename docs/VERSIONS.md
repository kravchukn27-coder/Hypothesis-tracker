# Versions

## Unreleased

- [PROD-023] Calendar no longer silently hides a Done experiment —
  confirmed with the user this deliberately replaces PROD-018's
  unconditional auto-hide. Setting a week's stage to Done (Calendar
  cell or the detail card's per-week editor) now prompts "Убрать
  задачу из календаря?" Да/Нет; Да hides it as before, Нет keeps it
  visible with Done styling. New `Experiment.calendarHiddenOnDone`
  (nullable tri-state, not a plain boolean: null = not asked yet,
  true = hidden, false = kept visible) — existing Done experiments
  were backfilled to `true` to preserve their current behavior,
  everything else starts at `null`. The null-default was a deliberate
  design correction found during verification: a plain
  default-hidden boolean raced with Next.js's automatic route refresh
  after the triggering Server Action, unmounting the row (and the
  prompt on it) before the user could answer "Нет" — staying visible
  by default until explicitly answered sidesteps that entirely rather
  than fighting revalidation timing. New shared
  `src/components/HideFromCalendarModal.tsx`;
  `setExperimentWeekStage` now returns `{ becameDone }` so both
  trigger points can show the prompt only on a genuine non-Done→Done
  transition of the experiment's *derived* stage.
- [BUG-005] Locked Status/Stage pills (`IconSelect`, week-tracked
  experiments per PROD-019) now show a lock icon in place of the
  dropdown chevron instead of just a hover-only tooltip — confirmed
  with the user: keep the lock (edit via Calendar/week editor), make
  it visibly obvious rather than reachable inline. New `locked` prop
  on `IconSelect` (`src/components/IconSelect.tsx`), separate from
  `disabled` so a transient in-flight save (`StatusCell`'s `pending`)
  doesn't flash the lock icon — only genuine structural locks do.
  Wired into `src/app/experiments/StageCell.tsx` (list) and
  `ExperimentForm.tsx`'s `StageField` (detail/create form).
- [BUG-004] Backlog/Experiments tables now render at a genuinely fixed
  width instead of silently auto-shrinking per viewport. `table-fixed`
  alone wasn't enough — with `width: auto` a `<table>` still stretches
  to fill its container even in fixed-layout mode; needed `w-max`
  (`width: max-content`) alongside `table-fixed` so the table sizes to
  the actual sum of its `tableWidths.ts` column widths instead.
  Verified at both a normal (1280px) and narrow (700px) window: columns
  render identically at both, and the narrow case now triggers a real
  horizontal scrollbar via the existing `overflow-x-auto` wrapper
  instead of squeezing the Funnel Level badge into wrapping. No width
  rebalancing was needed — the existing `FUNNEL_LEVEL_COL`
  (`w-72`/288px) turned out to have plenty of headroom once actually
  honored (~123px needed for the longest real value, "Cancel
  Subscription").
- [BUG-006] Fixed Calendar week-blocks moving together: dragging
  (move or resize) one contiguous block of an experiment's weeks now
  only touches that block's own `ExperimentWeekStage` rows, instead of
  shifting every week entry the experiment has. `buildTimeline`
  (`src/lib/calendar.ts`) now groups each experiment's full week list
  into contiguous blocks (consecutive `weekStart`, no gaps) before
  windowing, tagging each `WeekCell` with its block's true start/end
  even when that falls outside the visible window; the resize handle
  moved from "last filled cell in the row" to "the cell that is its
  own block's end," so each block gets its own handle independently.
  `shiftExperimentWeeks`/`resizeExperimentWeeks`
  (`src/app/experiments/actions.ts`) now scope their queries/mutations
  to one block's `weekStart` range instead of the whole experiment,
  with a new collision guard that no-ops a move/resize instead of
  throwing if it would land on another block's already-occupied weeks.
- [PROD-015] Calendar week-bars (`ExperimentWeekRow.tsx`) now show the
  stage's icon (`STAGE_ICONS` from `src/lib/experiment.ts`) next to
  the label, matching the Backlog/Experiments list pill-selects —
  previously color/label-only.
- [UI-013] Detail-form field-sizing fixes: the Status field on
  `/backlog/[id]`/`/backlog/new` and the Status (Stage) field on
  `/experiments/[id]`/`/experiments/new` now render via the shared
  `IconSelect` component (same pill + leading icon as the list rows'
  `StatusCell`/`StageCell`) instead of a hand-rolled plain `<select>` —
  `IconSelect` gained optional `id`/`name`/`title` props so it can also
  work as a native form field, not just a self-saving list control.
  Experiment's locked (week-tracked) path — disabled select plus a
  hidden `stage` input — carried over unchanged. Separately, Hypothesis
  form's "Выборка (users)" field switched from a single-line `Input` to
  a 3-row `Textarea`, matching "Моделирование" next to it. Visual/
  component-reuse only — no field name or behavior changes.
- [UI-015] Backlog's Funnel Level badge moved out from under the Name
  cell into its own column between Status and Score (`Badge`
  treatment, "—" when unset). Comment column narrowed (`LONG_TEXT_COL`
  → new `COMMENT_COL`, `w-72`) to make room while keeping Backlog's
  total table width matching Experiments' (`FUNNEL_LEVEL_COL`, also
  `w-72`) — Experiments' own Segment column keeps `LONG_TEXT_COL`
  unchanged. Also fixed a regression this surfaced: Backlog's table
  wrapper was `overflow-hidden`, which would have clipped the now-wider
  table instead of scrolling it; switched to `overflow-x-auto` to match
  the Experiments table's existing pattern.
- [PROD-018] Added an "archived" concept for Hypothesis and Experiment
  (`archived`/`archivedAt` columns on both models). Archive/Unarchive
  buttons on both detail cards (`/backlog/[id]`, `/experiments/[id]`),
  reusing `ConfirmDeleteButton`'s modal pattern (generalized with
  configurable label/color/`onSuccess` props). Both list pages
  (`/backlog`, `/experiments`) gained a bulk-select mode — "Изменить"
  toggles a checkbox column, then "Архивировать"/"Удалить" act on the
  selection, each behind its own confirmation (new `SelectionProvider`/
  `BulkActionBar` in `src/components/`). Archived items are hidden from
  the default list view, with a "Показать архив" toggle
  (`?archived=1`) to see only archived items — confirmed with the user
  over showing them inline with a badge. Reaching Done auto-prompts to
  archive: Hypothesis status → Done (inline `StatusCell` or the form)
  and Experiment stage → Done (inline `StageCell`, previously not wired
  to any post-save behavior, or the form) both show a "Хотите
  архивировать?" Да/Нет prompt, mirroring BUG-001's convert-to-
  experiment prompt mechanics. Bulk delete mirrors the single-delete
  guard (can't delete a hypothesis that still has experiments) by
  skipping and reporting instead of failing the whole batch. Done-stage
  experiments no longer appear on `/calendar`, independent of archived
  state (a Done experiment the user declines to archive still drops
  off the grid). Unarchive was not in the original acceptance criteria
  but added after confirming with the user — without it, Archive would
  have been functionally a slower Delete.
- [PROD-013] Creation date now surfaced everywhere: `/experiments/[id]`
  shows "Создан ..." under the title (mirrors the Hypothesis card's
  UI-003 treatment), and both `/backlog` and `/experiments` lists gained
  a "Created" sort dimension, newest-first by default. Resolved the
  no-spare-column-width constraint by piggybacking on the Name column —
  a small Clock-icon link (new `SortIcon` in
  `src/components/SortableHeader.tsx`) sits next to the existing Name
  sort header rather than adding a new column, confirmed by the user
  over the alternatives (new column, repurposing an existing one).
- [PROD-019] Calendar switched from day-granularity to week-granularity
  (nearest 8 weeks, same forward/back paging re-scaled to weeks), with
  new per-week stage editing — the actual mechanic the user reports:
  experiment stages progress week-by-week, not day-by-day, so the
  day-grid shipped as PROD-014/016/017 was the wrong unit. New
  `ExperimentWeekStage` table (`experimentId`, `weekStart`, `stage`)
  is the source of truth for weekly progress; `Experiment.stage`/
  `startDate`/`endDate` became a denormalized cache, auto-recomputed
  from the latest/earliest/latest week entries
  (`recomputeExperimentDerivedFields`) so every existing query/filter/
  sort/badge across the app keeps working unchanged. Each week-cell on
  an experiment's Calendar row is now individually clickable
  (`ExperimentWeekRow.tsx`) — a popover offers all 6 stages, including
  re-picking the same one to mean "continued into this week." Drag a
  filled cell to shift a whole block of weeks; drag its right edge to
  extend/shrink. The same per-week editing is also available from the
  detail card (`ExperimentWeekStagesEditor.tsx`, a "По неделям"
  section with a "+ Добавить неделю" button) — once an experiment has
  week entries, its old manual Status/date controls (list's
  `StageCell`/`DateCell`, the form's Status/date fields) become
  read-only both client- and server-side, since editing them directly
  would immediately be overwritten by the next recompute. Existing
  experiments with dates but no week entries render via on-the-fly
  synthesis (not persisted) rather than forcing a backfill; 3
  already-dated experiments *were* backfilled into real week entries
  via a one-off script (not committed) so nothing regressed visually
  on launch. `BUG-003` (day-grid drag-and-drop) is resolved as a
  byproduct — the day grid it was filed against no longer exists, and
  the week-grid equivalent (drag from "Без дат" onto a week header) is
  now verified working. This was explicitly scoped as a plan-only
  voice request first (card wrote up the redesign and open decisions,
  no code touched), then implemented after the user confirmed: (1) new
  table + derived-cache approach, (2) inline popover for the click-to-
  set UI, (3) replace the old day-grid drag mechanics with week-scaled
  equivalents. Verified extensively in the browser: click-to-set on a
  new and an already-filled week, re-picking the same stage on a
  consecutive week, drag-to-move, drag-to-resize, drag-from-"Без дат"
  onto a week, card-based stage change and "+ Добавить неделю", locked
  read-only states, and — importantly — a real regression caught and
  fixed during testing: the old day-bar's click-through link to
  `/experiments/[id]` disappeared once bars were replaced by per-week
  buttons; fixed by making the row's name link to the experiment (was
  linking to the hypothesis) with the hypothesis moved to its own
  subtitle link.

- [TECH-003 follow-up] Two user-requested tweaks to the Experiment form
  (2026-08-07, same day as TECH-003): (1) Segment converted from a
  free-text field into a 6th multi-select tag category — same pattern
  as Platform/Channel/Market/Product (new `Segment` table, rose badge
  color, `TagMultiSelect`-edited). Unlike `targeting`, existing
  `segment` string values *were* backfillable (unambiguous 1-string-
  to-1-tag mapping) — one `Segment` row created per distinct existing
  value and connected to the experiments that had it, via a two-step
  migration (add the relation additively first, backfill, only then
  drop the old column) so no data was ever actually at risk despite
  Prisma's safety gate requiring the same explicit consent for the
  final drop as any other `--accept-data-loss` push. The Experiments
  list's Segment column and filter now read the relation (joined tag
  names; filter by `Segment.id`) instead of the old scalar string.
  (2) "Автор" moved from the "Таргетинг" section to "Основное",
  alongside Status. Verified in the browser: both backfilled Segment
  values ("Segment A", "ва") show correctly on their experiments and
  in the list/filter after restarting the dev server (its in-memory
  Prisma client was stale from before the schema change).

- [TECH-003] `Experiment.targeting` (free text, e.g. `"GW, квиз"`) —
  a flattened mix of 5 distinct tag categories from the source tool —
  replaced with 5 real multi-select tag fields on the Experiment
  form: Funnel Level (amber, extends the existing `FunnelLevel` table/
  UI onto Experiment as well as Hypothesis), Platform (green), Channel
  (blue), Market (orange), Product (purple). Each is a Prisma implicit
  many-to-many relation to a new table (`Platform`/`Channel`/`Market`/
  `Product`, same shape as `FunnelLevel`: `id`, `name` unique,
  `isCustom`, `createdAt`), confirmed multi-select (several tags at
  once per category) over a single-FK alternative. New shared
  `TagMultiSelect` component (`src/components/TagMultiSelect.tsx`) —
  removable colored chips + a "+ Добавить" control that opens either a
  dropdown of existing values or (via "+ Добавить новый...") a text
  input to create one — submits two hidden fields per category
  (`${name}Ids`, `${name}New`) that the server action resolves into a
  connect/set list, upserting new names first. `Experiment.targeting`
  itself was dropped from the schema (confirmed data-loss tradeoff, no
  automatic backfill was possible from free text into structured
  tags — ran via `prisma db push --accept-data-loss` with explicit
  user consent, since this is a genuinely irreversible action Prisma's
  own safety gate requires separate confirmation for). The existing
  `"Квиз"` FunnelLevel value was renamed to `"Quiz"` in place
  (confirmed by the user — a rename, not a new row) as part of
  translating the category to English; 11 new tag values seeded
  across the 5 tables via a one-off script (not committed, same
  pattern as this session's other DB cleanup scripts). Backlog's
  FunnelLevel badge switched from the neutral default color to amber,
  matching the source tool. Experiments list's old "Таргетинг /
  Segment" column is now Segment-only (showing the new structured tags
  there is a separate follow-up, out of scope here, per the card).
  Verified in the browser: added an existing tag (Funnel Level →
  Paywall) and a brand-new tag (Channel → a test value) to an
  experiment, confirmed both persisted correctly after reload with the
  right badge colors; confirmed removing a tag (via `set`, not
  `connect`) actually disconnects it; confirmed the Hypothesis form's
  existing single-select Funnel Level field is unaffected and shows
  the renamed "Quiz" value.

- [PROD-017 correction] Drag-and-drop from "Без дат" onto a day-column
  header (part of the PROD-017 entry below) does not actually work —
  confirmed broken by the user 2026-08-07, still broken after a fix
  attempt (`draggable={false}` on the row's `<Link>`, to stop it
  stealing the native browser drag gesture — verified working in this
  session's own synthetic/headless testing, but not in the user's real
  browser). Root cause unconfirmed. Deprioritized per the user
  2026-08-07 — see `BUG-003` in `docs/backlog/BUGS.md`; not spending
  further time on it without new diagnostic information. The inline
  date-input half of PROD-017 (below) is unaffected and confirmed
  working.

- [PROD-017 fix] Fixed a real bug in the inline date inputs just shipped:
  `DateCell` (`src/app/experiments/DateCell.tsx`) saved on every
  keystroke, so picking only a start date on a previously-undated
  experiment saved immediately with the end still empty — the Calendar
  then defaulted the missing end to the start, moving the row into the
  grid as a 1-day bar before the user had a chance to pick an end date
  (user report, 2026-08-07). Fixed by holding off the save, for a
  row that started fully undated, until both fields are filled — a
  `useRef` flag (`awaitingFirstCompleteRange`, seeded from whether both
  dates were initially null) skips the save while only one field has a
  value, then clears once both are set. Existing dated experiments
  (Experiments list, PROD-012) are unaffected — the flag starts `false`
  for them since they never start with both dates null, so single-field
  edits there still save immediately as before. Verified in the
  browser: setting only a start date on an undated row leaves it in
  "Без дат" (input keeps the typed value); setting the end date too
  then saves and moves it into the grid. Restored the test experiment's
  dates back to null afterward (shared dev DB with another session).

- [PROD-017] Calendar's "Без дат" section is now actionable instead of
  a plain link list — each row got inline start/end date inputs (new
  `UndatedRow`, reusing PROD-012's `DateCell` as-is) that save
  immediately and move the row out of "Без дат" into the day grid, no
  card navigation needed. Also added drag-to-schedule: dragging an
  undated row's name/hypothesis block (the drag handle — scoped there
  specifically so it doesn't fight with clicking into the date inputs)
  onto a day column header (new `DayHeaderCell`, native HTML5
  drag-and-drop) sets a 1-day duration on drop (`start === end ===`
  that day), matching PROD-016's existing 1-day minimum-duration
  floor; the user can resize afterward with PROD-016's drag handles.
  Both call the existing `updateExperimentDates` action +
  `router.refresh()`, same pattern as `DateCell`/`ExperimentBar`.
  Verified in the browser (via synthetic events — native pointer/drag
  interactions don't map to the computer-use click tool here): inline
  date input moves a row from "Без дат" into the grid; dragging an
  undated item onto a specific day header schedules it there as a
  1-day bar. Restored the two experiments' dates back to null
  afterward (shared dev DB with another session).

- [UI-016] Saving a hypothesis or experiment now returns to the list
  instead of leaving you stuck on the detail card. `updateHypothesis`
  (`src/app/backlog/actions.ts`) redirects to `/backlog` normally, and
  still to `/backlog/[id]?promptExperiment=1` only for BUG-001's
  status-change prompt case (unchanged, so the modal still has a card
  to appear on). `createExperiment`/`updateExperiment`
  (`src/app/experiments/actions.ts`) redirect to `/experiments`
  instead of the (new) experiment's own detail page.
  `createExperiment` no longer needs the created row's id, so it no
  longer captures it. Since the UI-004 "Сохранено" toast rides the
  `?saved=1` redirect target, `SavedToastGate` is now also mounted on
  `/experiments` (it already was on `/backlog`, for hypothesis
  creation). Verified in the browser (via direct form submission,
  since the shared dev server's browser pane wasn't cooperating with
  scroll/click): a plain hypothesis save redirects to `/backlog` with
  the toast; a status-change save that should prompt still redirects
  to `/backlog/[id]` with the modal; experiment update and create both
  redirect to `/experiments` with the toast. Cleaned up the test
  experiment/status change afterward (shared dev DB).

- [PROD-014/016 fix] Fixed a real bug: after paging the Calendar window
  (prev/next or "Сегодня"), experiment bars stayed visually anchored to
  their old grid position instead of moving with the new window,
  making an in-progress experiment look like it started/ended on the
  wrong day (user report, 2026-08-07 — `web-funnel-v4_2` appeared to
  start 15 авг instead of its real 10 авг after paging forward). Root
  cause: `ExperimentBar`'s local `pos` state was seeded from
  `colStart`/`colEnd` props only on first mount (`useState`) and never
  re-synced when the server recomputed new column positions for a
  different window — a classic stale-derived-state bug, since
  client-side navigation between `/calendar?start=...` URLs doesn't
  remount components whose position in the tree is unchanged. Fixed by
  giving `<ExperimentBar>` an explicit `key` including `colStart`,
  `colEnd`, and the window start date (`src/app/calendar/page.tsx`),
  forcing a fresh mount — and therefore a fresh `pos` — whenever any of
  those change. Also fixed: the day grid's row count made the table
  visibly grow/shrink depending on how many experiments fell in the
  current window (user feedback, screenshots comparing a 2-row vs
  3-row window) — now padded with blank filler rows up to a
  `MIN_ROWS = 3` floor so the table is always at least that tall,
  regardless of window content. Verified in the browser: paging
  forward now shows bars at their correct real dates; a 1-row and a
  0-row window both render at the same height as a 3-row window.

- [PROD-014/016 revision] Calendar window widened from 10 to 15 days
  and the prev/next arrows now page by 5 days instead of 1 (user
  feedback after checking the table live, 2026-08-07). Both are driven
  by two constants in `src/lib/calendar.ts` (`WINDOW_DAYS`,
  `PAGE_STEP_DAYS`) — `WINDOW_DAYS` alone also widens the drag clamp
  bounds in `ExperimentBar` since it reads the same constant, no
  separate change needed there. Arrow `aria-label`s updated to match
  ("Назад/Вперёд на 5 дней"). Verified in the browser: 15 day columns
  render, next/prev jumps the window by 5 days.

- [PROD-014/016 revision] Removed the day grid's horizontal scrollbar
  (user feedback, 2026-08-07: the 15-day grid at a fixed 112px/column
  min-width overflowed the card) by dropping the `minmax(112px, …)`
  floor to `minmax(0, …)` so all 15 columns always fit the fixed-width
  card, and splitting the day header into two lines ("07 авг" /
  weekday) so labels stay legible at the resulting narrower column
  width. New `formatWeekdayLabel` in `src/lib/calendar.ts` alongside
  the existing `formatDayLabel` (now date-only, weekday split out).
  Verified in the browser: `scrollWidth === clientWidth` on the grid
  wrapper (no scrollbar), labels still readable.

- [PROD-016] Calendar experiment bars are now draggable — grab the
  body to move both `startDate`/`endDate` by the same offset (duration
  preserved), or grab a ~8px strip on the left/right edge to resize
  just that end (1-day minimum duration). New client component
  `src/app/calendar/ExperimentBar.tsx` handles pointer-event drag
  (move/resize-left/resize-right), giving live optimistic visual
  feedback via local grid-column state during the drag and persisting
  through the existing `updateExperimentDates` action
  (`src/app/experiments/actions.ts`, PROD-012) + `router.refresh()` on
  drop — same pattern as `DateCell`. A plain click (no pointer
  movement) still navigates to `/experiments/[id]` as before. Drag is
  clamped to the current 10-day window — no auto-paging past its
  edges. Verified in the browser (via synthetic pointer events, since
  computer-use drag doesn't map to this custom pointer handling):
  move preserves duration and persists across reload, right-edge
  resize changes only `endDate`, left-edge resize clamps at the 1-day
  minimum, and a non-dragging click still navigates.

- [PROD-014] Calendar screen now shows a fixed ~10-day rolling window
  of day columns instead of a week-granularity grid spanning the
  entire experiment date range. `src/lib/calendar.ts`'s `buildTimeline`
  rewritten around day-based helpers (`startOfDay`/`addDays`/
  `daysBetween`) and takes a window start + fixed day count, clipping
  bars to the window edges rather than omitting experiments that only
  partially overlap it. Prev/next arrows page the window by one day
  and a "Сегодня" control resets it to today, both via a `start`
  URL search param (`/calendar?start=YYYY-MM-DD`) — no client JS,
  consistent with the rest of the app's server-rendered pages.
  Experiments past their `endDate` with `stage` ≠ `DONE` get a red
  ring/badge. Foundation for PROD-016 (drag-to-reschedule). Verified
  in the browser: paging forward/back, "Сегодня" reset, and bar
  clipping at both window edges.

- [BUG-002] Fixed the status/stage pill-select icon overlapping the
  label text on `/backlog` and `/experiments` (e.g. "Accepted" reading
  as "cepted"). Root cause: native `<select>` chrome (internal text
  padding, the browser's own dropdown arrow) isn't fully governed by
  arbitrary CSS padding, so a hand-tuned `pl-6` looked fine in one
  renderer but clipped the icon into the text in another. Fix: new
  shared `src/components/IconSelect.tsx` — `appearance-none` removes
  native chrome entirely, replaced with our own leading icon and a
  `ChevronDown`, with generous padding. `StatusCell`/`StageCell` are
  now thin wrappers around it, guaranteeing identical sizing between
  the two lists by construction. Verified in the browser at both
  desktop and mobile widths, plus that inline editing still works.

- [PROD-012] Experiments list's "Даты" column is now inline-editable —
  two `<input type="date">`s right in the row (new `DateCell`
  component, mirrors PROD-009's `StageCell`), updating
  `Experiment.startDate`/`endDate` immediately via a new
  `updateExperimentDates` action, no navigation to
  `/experiments/[id]` needed. Widened `DATE_COL` (tableWidths.ts,
  `w-44` → `w-60`) to fit both inputs comfortably; only used by this
  table, so no impact elsewhere. No extra `/calendar` revalidation
  added — matches the existing convention (no other date-changing
  action revalidates it either), since the Calendar screen already
  reads fresh data by construction. Verified in the browser: set a
  date on an undated experiment, row re-sorted correctly by the new
  start date, Calendar screen picked it up without any calendar-side
  change, then cleared it back to its original empty state.

- [UI-010] Replaced the plain "← Backlog"/"← Experiments" back-link on
  `/backlog/[id]` and `/experiments/[id]` with a real breadcrumb
  ("Backlog / Название" / "Experiments / Название"). New shared
  `src/components/Breadcrumb.tsx` (list label + href, current item
  name), used by both detail pages. Verified in the browser on both
  routes.

- [UI-005] Backlog list's Comment column is now clickable (navigates
  to `/backlog/[id]`, same target as the row's Name link) when a
  comment exists, and shows a fade-to-transparent mask at the clipped
  edge instead of relying only on the native ellipsis, as a clearer
  affordance that the text continues off-screen. Column width
  unchanged (`LONG_TEXT_COL`, from UI-008). Empty comments stay a
  plain non-interactive "—". Verified in the browser: fade renders on
  a long comment, clicking it opens `/backlog/[id]` with the full
  comment visible.

- [UI-004] Added a "Сохранено"/error toast after hypothesis/experiment
  create and update, without touching any existing redirect target.
  New app-wide `ToastProvider` (`src/components/toast/ToastProvider.tsx`,
  mounted in `src/app/layout.tsx`) exposing `useToast()`. Success path:
  reuses the exact technique already established by
  `ExperimentPromptGate`/BUG-001 — server actions now redirect with an
  added `?saved=1` (alongside the existing `?promptExperiment=1` where
  applicable, e.g. `createHypothesis`/`updateHypothesis` in
  `src/app/backlog/actions.ts`, `createExperiment`/`updateExperiment`
  in `src/app/experiments/actions.ts`), and a new
  `SavedToastGate` (mounted on `/backlog`, `/backlog/[id]`,
  `/experiments/[id]`) shows the toast on mount and strips the flag via
  `router.replace`, converging on the same clean URL regardless of
  which gate's effect runs first. Error path (no navigation on
  validation failure): `HypothesisForm`/`ExperimentForm` fire an error
  toast via `useEffect` on `state.error`, additive to the existing
  inline red-box message. Caught and fixed a double-toast bug during
  verification — React's dev-only StrictMode double-invokes effects,
  so `SavedToastGate` needed a `useRef` guard to ensure `showToast`
  only fires once per navigation. Verified in the browser: single
  toast on hypothesis create/update, single toast on experiment
  create/update, a status change that also triggers BUG-001's
  "Перевести в эксперимент?" modal shows both correctly, and a
  validation error shows the error toast with no navigation and the
  existing inline error message intact.

- [UI-006] `/backlog/[id]`'s experiment button now mirrors the Backlog
  list's PROD-011 conditional: no experiments yet → "Создать
  эксперимент" (unchanged, `/experiments/new?hypothesisId=...`); has
  experiments → "Показать эксперимент", linking to
  `/experiments?hypothesisId=...` (highlights matching rows there, same
  as the list). Added `_count: { select: { experiments: true } }` to
  the detail page's Prisma query to decide which label to show.
  Verified in the browser on both a hypothesis with experiments and
  one without.

- [UI-007] Автор on the Experiment create/edit form is now a select of
  existing author names + "+ Добавить нового..." (new `AuthorField` in
  `ExperimentForm.tsx`, mirrors `FunnelLevelField`'s select+add
  interaction, same "edit an unlisted/legacy value → starts in add-new
  mode" fallback), sourced from a new `getAuthors()` action
  (`src/app/experiments/actions.ts`, distinct sorted author names) and
  threaded into both `/experiments/new` and `/experiments/[id]`. No
  data-model change — still the same free-text `author` column, just a
  different picking UX. Wherever Автор is shown read-only (only the
  Experiments list's АВТОР column — the card's other mentions,
  `StageCell` row and the detail page, don't actually display it as
  read-only text, confirmed before implementing) it now shows a small
  colored initials avatar next to the name (new `src/lib/avatar.ts`:
  `getInitials`/`getAvatarColorClasses`, hash-based so the same name
  always gets the same color; new `src/components/Avatar.tsx`).
  Verified in the browser: avatar+name renders correctly and
  consistently in the list, the create form's select+add works, an
  existing author is correctly pre-selected on the edit form, a save
  round-trip persists the change, and the existing Автор `FilterBar`
  filter is unaffected.

- [UI-008] Unified the Backlog and Experiments list tables' visual
  system. New shared `src/components/tableWidths.ts` (NAME_COL,
  STATUS_COL, META_COL, LONG_TEXT_COL, DATE_COL, ACTION_COL) applied
  to both tables' columns, replacing each table's own ad hoc
  `max-w-*`/`truncate` choices — Experiments' Таргетинг/Segment column
  widened to match Backlog's Comment column (the reference width, per
  the user). Added `lucide-react` (new dependency) for per-status/
  per-stage icons: `STATUS_ICONS`/`STAGE_ICONS` maps in
  `src/lib/hypothesis.ts`/`src/lib/experiment.ts`, rendered as an
  overlay on the existing `StatusCell`/`StageCell` pill-selects (still
  real `<select>`s, inline-edit unchanged) — required splitting
  `Badge.tsx`'s `BADGE_BASE_CLASSES` into a new `BADGE_SHAPE_CLASSES`
  (no horizontal padding) so the icon-prefixed `pl-6` doesn't fight
  the badge's own `px-2.5` over the same CSS property. Added a
  status-colored `border-l-4` accent per row (`STATUS_BORDER_CLASSES`/
  `STAGE_BORDER_CLASSES`, same color families as the badge classes).
  Per user decision: PROD-011's amber `bg-amber-50` jump-to-experiment
  highlight on the Experiments list is kept layered on top of the new
  border, not replaced by it. Backlog's remaining row action
  ("→ Эксперимент"/"Создать эксперимент") is now icon-only
  (ArrowRight/Plus with `aria-label`) — the card's original "trash for
  delete, pencil for edit" language was already stale (UI-002 and
  PROD-010 had already removed those list-row links), confirmed with
  the user before implementing. Verified in the browser: both lists'
  icons/borders/widths, inline status/stage edit still works, BUG-001's
  "Перевести в эксперимент?" modal still fires on a real status
  transition, and a Backlog jump to Experiments shows the amber
  highlight and border together on the matching rows.

- [UI-009] Redesigned `HypothesisForm`/`ExperimentForm` (and their
  detail/create pages) from one flat field list into labeled sections:
  Hypothesis — "Основное" (Name, Hypothesis text, Funnel Level,
  Status), "Оценка" (Conversion, Impact, Effort, Reach, Confidence,
  Score), "Дополнительно" (Result if Done, Comment, Моделирование,
  Выборка, Task); Experiment — "Основное" (Name/hypothesis link,
  Status), "Таргетинг" (Автор, Segment, Таргетинг), "Расписание"
  (dates). New shared components: `src/components/Field.tsx` (label +
  control wrapper), `src/components/Input.tsx` (`FIELD_CLASSES` +
  `Input`/`Textarea`/`Select`), `src/components/FormSection.tsx`
  (titled section grouping) — replacing the duplicated local `Field`
  and `inputClass` definitions previously hand-rolled in each form.
  Bespoke value-specific widgets (ScaleButtons, SegmentedControl,
  FunnelLevelField, the Status/Stage pill-selects from UI-011) were
  kept as-is, not forced into the generic primitives. Score keeps its
  distinct stat-card treatment, just repositioned inside "Оценка".
  Verified in the browser: both create forms, both detail forms with
  existing data, the Done-status conditional Result field, and a save
  round-trip on the Experiment form (Автор change persisted after
  reload, then reverted).

- [UI-011] Unified badge/tag visual system: new shared `Badge`
  component (`src/components/Badge.tsx`) exporting `BADGE_BASE_CLASSES`
  (shape/padding/typography) and a `NEUTRAL_BADGE_COLOR` for tags with
  no per-value color mapping. Per-value color logic (`STATUS_BADGE_CLASSES`,
  `STAGE_BADGE_CLASSES`) is unchanged — only how it's applied is now
  centralized. Applied to: `StatusCell`/`StageCell` (list inline-edit
  pills, now built from the shared base class instead of duplicated
  Tailwind strings), the Backlog list's Funnel Level (previously plain
  text, now a neutral badge), and the Status/Stage `<select>`s on the
  Hypothesis/Experiment detail and create forms (previously styled as
  plain inputs, now the same colored pill as the list — added a small
  `StageField` client component in `ExperimentForm.tsx` mirroring the
  existing controlled-select pattern in `HypothesisForm.tsx`). Verified
  in the browser: Backlog list, Experiments list, hypothesis detail
  page, experiment detail page, and the hypothesis create form all show
  matching pill styling.

- [UI-003] `/backlog/[id]` now shows the hypothesis's creation date
  ("Создана DD месяц YYYY г.") as read-only info under the title —
  display-only, `Hypothesis.createdAt` already existed and has been
  collected automatically since the model was first created. Verified
  in the browser.

- [PROD-007] Added click-to-sort column headers on both tables (new
  shared `SortableHeader` component, plain server-rendered links, no
  JS) — clicking toggles direction, active column shows an arrow.
  Backlog: Name/Status/Score, default Score desc. Experiments:
  Эксперимент(Name)/Status/Автор/Даты, default Даты asc. Per the
  user's decision, **removed** the "Сортировка" dropdown from
  Backlog's `FilterBar` (PROD-004) instead of keeping both controls —
  one sort mechanism, not two competing ones. Experiments never had a
  sort dropdown, so no removal needed there; its Prisma `orderBy` was
  replaced with the same in-memory sort used for the header logic, for
  one consistent code path. Verified in the browser: Backlog sorted by
  Name asc/desc via header clicks; Experiments sorted by Name via
  header click, filters stayed applied alongside.

- [PROD-006] Experiments created from a hypothesis are now named
  automatically after it, instead of taking a free-typed name: first
  experiment = hypothesis name exactly, second = hypothesis name + " 2",
  third + " 3", etc. (based on existing experiment count for that
  hypothesis, computed server-side in `computeExperimentName`). The
  create form no longer shows a Name field, just an explanatory note.
  Confirmed by the user: the name **is** editable afterward on
  `/experiments/[id]` — split `createExperimentSchema` (no `name`) from
  `updateExperimentSchema` (`name` required) in
  `src/app/experiments/actions.ts` to reflect that. Verified in the
  browser: first experiment for a hypothesis named exactly like it,
  second one got " 2" appended, and renaming on the edit form saved
  correctly.

- [PROD-008] Added an Автор filter to the Experiments list, same
  pattern as Segment (PROD-004) — a `<select>` of distinct existing
  `author` values, not a free-text search. Also fixed the filter bar
  to always show the Status filter (it was previously gated behind
  `segmentOptions.length > 0`, hiding Status too when no experiment had
  a segment set — a side effect of touching this code for Author, not
  a separate task). Verified in the browser: Автор filter narrowed 3
  experiments to 1 matching the selected author.

- [PROD-009] Experiments list's Status column is now inline-editable —
  a colored dropdown right in the row (new `StageCell` component,
  mirrors Backlog's `StatusCell`), updating `Experiment.stage`
  immediately via a new `updateExperimentStage` action, no navigation
  to `/experiments/[id]` needed. No "convert to X" prompt logic here —
  that's specific to Hypothesis status. Verified in the browser:
  changed an experiment's status from the list, badge color/label
  updated in place.

- [PROD-011] Backlog row action is now conditional instead of always
  routing to "create a new experiment": hypotheses with no experiments
  yet keep that behavior ("Создать эксперимент"); hypotheses that
  already have experiments instead link to `/experiments?hypothesisId=...`,
  which highlights (amber background) every experiment belonging to
  that hypothesis — not just one, since a hypothesis can have several
  (PROD-006) — and auto-scrolls the first into view (new
  `ScrollToHighlighted` client component). Verified in the browser: a
  hypothesis with two experiments highlighted both matching rows on
  `/experiments` and left the unrelated third row unhighlighted; a
  hypothesis with none still went to the create flow.

- [PROD-010] Experiments list: clicking an experiment's name now opens
  its own detail/edit page (`/experiments/[id]`) instead of its parent
  hypothesis's Backlog card — reverses the original PROD-002 default.
  Removed the now-redundant "Изменить" list link. The path to the
  hypothesis is unchanged as a second step: `/experiments/[id]`
  already links to `/backlog/[hypothesisId]` via its "Гипотеза" field.
  Verified in the browser: experiment name links to `/experiments/[id]`,
  and that page still links through to the hypothesis.

- [UI-002] Removed the "Удалить" (delete) button from Backlog and
  Experiments list rows — it now lives only on the detail pages
  (`/backlog/[id]`, `/experiments/[id]`), same confirmation modal and
  blocking rule from PROD-005, unchanged there. Verified in the
  browser: both lists show no delete action; both detail pages still
  do.

- [PROD-004] Added sort and filter to the Backlog and Experiments
  lists, both driven by URL query params (shareable/bookmarkable, no
  client state) via a new shared `FilterBar` component. Backlog: sort
  by Score (default)/Status/Name, filter by Funnel Level and/or
  Status. Experiments: filter by Status (the merged status/stage field
  from TECH-002 — this card predates that merge and originally said
  "Status/Stage", now the same filter) and Segment (a `<select>` of
  distinct existing segment values in the data, not a free-text
  search, consistent with how Funnel Level already works). A
  "Сбросить" link appears once any field differs from its default and
  clears the query entirely. Verified end-to-end in the browser: sort
  by Name, filter Backlog by Status, filter Experiments by Segment,
  reset.

- [PROD-005] Added delete for hypotheses and experiments, both gated
  behind a confirmation modal (new shared `ConfirmDeleteButton` in
  `src/components/`). Deleting a hypothesis is **blocked** while it
  still has experiments — the modal shows the exact count and tells
  the user to delete those first, instead of silently cascading (the
  user's explicit call, since cascade risked losing experiment data
  without warning). Deleting an experiment has no such restriction.
  Buttons live on both list rows and detail pages for Backlog and
  Experiments. Verified end-to-end in the browser: delete an
  experiment, attempt to delete a hypothesis with experiments (blocked
  with the count-specific message), delete a hypothesis with none
  (succeeds, redirects to the list).

- [UI-001] Backlog form: moved the Score card down to sit right after
  Impact/Effort/Reach/Confidence instead of pinned above Name/
  Hypothesis text — numbers and result now live together. Changed
  Funnel Level from a free-typing `<datalist>` combobox to a `<select>`
  of existing values plus a "+ Добавить новый..." option (matching how
  Status works), backed by a new `FunnelLevelField` component in
  `HypothesisForm.tsx`. No server-side change needed — the form field
  is still submitted as `funnelLevel` either way, and the existing
  upsert-by-name action logic handles both cases unchanged.

- [TECH-002] Merged `Experiment.status` (Dev/Experiment/Done) and
  `Experiment.stage` (Discovery/Design/Development/Experimentation/
  Analysis) into a single required `stage` field: `ExperimentStage` =
  Discovery/Design/Development/Experimentation/Analysis/Done, default
  `DISCOVERY`. Removed the `ExperimentStatus` enum entirely. Labeled
  "Status" in the Experiments list/form, "Stage" in the Calendar — same
  field, same colors everywhere, no more parallel/duplicated concept.
  Experiments list dropped its separate Status/Stage columns down to
  one; Calendar's per-row sidebar dropped the redundant status badge
  (the color bar already shows the same value). Pushed via
  `prisma db push --accept-data-loss` on the local dev DB (2 existing
  rows had `stage IS NULL` under the old nullable field — backfilled to
  `DISCOVERY` before the push so the new required column could apply).

- [BUG-001] Fixed "convert to experiment?" prompt inconsistency: it now
  fires the same way from the Backlog list's inline status dropdown
  and from the full edit form on `/backlog/[id]` (previously only the
  list triggered it). Also tightened the trigger rule to exclude
  `HOLD` and `DONE` in addition to `NEW` — only `PLANNED`,
  `IN_PROGRESS`, `ACCEPTED` prompt now. The rule itself lives in one
  place (`shouldPromptExperimentConversion` in `src/lib/hypothesis.ts`)
  and the modal markup was extracted into a shared
  `ConvertToExperimentModal` component used by both `StatusCell` (list)
  and a new `ExperimentPromptGate` (detail page, driven by a
  `?promptExperiment=1` redirect flag that gets stripped from the URL
  after showing). Caught and fixed an inverted condition during manual
  verification (`experiments === 0` was passed where `experiments > 0`
  was meant) — worth remembering: verify the *actual* browser behavior
  for both the positive and negative case, not just that the code
  compiles/lints clean.

- Project scaffolded: Next.js (App Router) + TypeScript + Tailwind +
  Prisma/PostgreSQL.
- Data model defined for `Hypothesis` and `Experiment`, derived from
  the source Google Sheet (`Copy of CR Boost backlog - 2026.xlsx`).
- Documentation structure set up (`docs/PROJECT_CONTEXT.md`,
  `docs/backlog/`, this file), mirroring the Battery Pricing App's
  approach.
- `Experiment.hypothesisId` made required — every experiment must
  belong to a hypothesis, with a click-through from the Experiments
  screen to the Backlog card (TECH decision, see `docs/PROJECT_CONTEXT.md`).
- [TECH-001] Local Postgres provisioned via `npx prisma dev`; schema
  synced with `prisma db push` (`FunnelLevel`, `Hypothesis`,
  `Experiment` tables) — see `docs/PROJECT_CONTEXT.md` → Local
  Development for why `db push` instead of `migrate dev` for now.
- Added `Hypothesis.name` (short title, not in source data) and made
  `Hypothesis.effort` a fixed 1–5 scale (same widget as Impact) instead
  of a free number, per user direction on the Backlog screen design.
- [PROD-001] Backlog screen shipped: `/backlog` list (Name, Status,
  Score, Comment, sorted by Score desc), `/backlog/new` and
  `/backlog/[id]` create/edit form (Score computed live client-side,
  Funnel Level as a native-datalist combobox that upserts new tags,
  Impact/Effort as matching 1–5 button groups, Conversion as a 3-way
  segmented control). Verified end-to-end in the browser: create →
  live score → save → list.
- [PROD-002] Experiments screen shipped: `/experiments` list
  (Эксперимент, Status, Stage, Автор, Таргетинг/Segment, Даты),
  `/experiments/new` and `/experiments/[id]` create/edit form. Creating
  an experiment requires picking an existing hypothesis (blocked with a
  "create a hypothesis first" message if none exist); the experiment
  name in the list links to `/backlog/[hypothesisId]`, a separate
  "Изменить" link opens the experiment's own edit page. Added top nav
  (Backlog / Experiments) with active-route highlighting. Verified
  end-to-end in the browser.
- [PROD-003] Calendar screen shipped: `/calendar`, a week-granularity
  timeline computed from `startDate`/`endDate` (min/max across
  experiments, not a fixed set of columns like the Excel sheet).
  Experiments render as colored bars spanning their weeks (color =
  Stage), clicking a bar opens `/experiments/[id]`, clicking the row's
  name opens `/backlog/[hypothesisId]`. Experiments with no dates are
  listed separately below the grid instead of being dropped. No
  drag/resize on this screen — dates are still edited on the
  Experiments screen's form; both screens read the same
  `startDate`/`endDate` so edits show up in both automatically.
  Verified end-to-end in the browser with two dated experiments
  (different stages/colors) and one undated.
- User decided: finish remaining mechanics across all three screens
  before doing a real visual design pass — current styling (plain
  zinc/Tailwind defaults) is intentionally a placeholder, not final.
- Reworked the Backlog → Experiment workflow per user direction (see
  `docs/PROJECT_CONTEXT.md` → Hypothesis ↔ Experiment workflow):
  - Creating a hypothesis now redirects to the `/backlog` list, not to
    its own detail page.
  - Backlog list's Status column is inline-editable (`StatusCell`, a
    dropdown right in the row) instead of requiring a trip into the
    detail page.
  - Removed the standalone "+ Новый эксперимент" entry point from
    `/experiments`; `/experiments/new` now requires
    `?hypothesisId=...` and redirects to `/backlog` without one. The
    hypothesis picker dropdown in `ExperimentForm` was replaced with a
    fixed hypothesis (shown as a link, submitted as a hidden field).
  - Added entry points into experiment creation: a "→ Эксперимент" link
    per Backlog row, a "Создать эксперимент" button on
    `/backlog/[id]`, and a modal prompt that appears when a
    hypothesis's status changes (via the inline dropdown) to anything
    other than `NEW` while it still has zero experiments — "Перевести
    в эксперимент?" with a direct link into the pre-filled create form.
  - Creating an experiment now also sets its parent hypothesis's status
    to `IN_PROGRESS` automatically (`createExperiment` in
    `src/app/experiments/actions.ts`).
  - Verified end-to-end in the browser: create hypothesis → redirected
    to list → change status inline → prompt appears → create experiment
    from prompt → hypothesis status auto-flips to In progress → prompt
    no longer appears on further status changes for that hypothesis →
    direct hit on `/experiments/new` (no query param) redirects to
    `/backlog` → `/experiments` has no create button.
