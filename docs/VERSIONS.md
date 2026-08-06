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
