# Versions

## Unreleased

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
