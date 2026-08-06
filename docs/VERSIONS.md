# Versions

## Unreleased

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
