# Versions

## Unreleased

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
