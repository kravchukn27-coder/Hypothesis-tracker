# Project Context

## Overview

Hypothesis Tracker — internal web app replacing a Google Sheet used to
track growth hypotheses (backlog), the experiments that test them, and
a calendar of experiment stages over time.

Source of truth for the original data model: a Google Sheet exported as
`Copy of CR Boost backlog - 2026.xlsx`, sheets `Backlog` and
`График экспериментов`. See "Origin data model" below for the mapping.

## Tech Stack

- Next.js (App Router), TypeScript
- Tailwind CSS
- Prisma + PostgreSQL

## Screens (build order)

1. **Backlog** ✅ — list/create/edit hypotheses, auto-computed Score,
   status. `/backlog`, `/backlog/new`, `/backlog/[id]`.
2. **Experiments** ✅ — list/create/edit experiments (status, author,
   targeting, segment, dates, stage). `/experiments`,
   `/experiments/new`, `/experiments/[id]`. Experiment name in the list
   links to its parent hypothesis's `/backlog/[id]` card (not to its
   own edit page — that's the separate "Изменить" link).
3. **Calendar** — timeline/Gantt view of experiments driven by
   `startDate`/`endDate`/`stage`, replacing the Excel week-column hack.
4. **Extras** — custom funnel-level tags, filters/sorting.

Screens 3–4 not built yet; this file will be updated as they land.

## Core Data Rules

- `Hypothesis.Score` is **not stored** — it is always derived as
  `impact * confidence * reach / effort`, computed at read time. Storing
  it would let it drift from its inputs after an edit. This mirrors the
  Google Sheet's live formula cell (column H), just recomputed in code
  instead of by Sheets.
- `FunnelLevel` is a table, not a hardcoded enum, because the source
  data already contains free-form/inconsistent values (typos like
  "пейвол", ad-hoc levels like "новая воронка") and the user wants to
  add custom tags over time.
- `Experiment.hypothesisId` is a **required** link from an experiment
  back to the hypothesis it tests. The original spreadsheet has no such
  link (the two sheets were independent lists) — this is an added
  relation, not a migrated field, confirmed required by the user: every
  experiment must be created from a hypothesis, and the Experiments
  screen must let you click through from an experiment's name to its
  Backlog card (see PROD-002).
- Experiment stage/date model replaces the spreadsheet's "one column per
  week, stage name as cell value" layout with real `startDate`,
  `endDate`, and a `stage` enum (Discovery/Design/Development/
  Experimentation/Analysis), so the Calendar screen can be computed
  instead of hand-shifted between columns.

## Origin Data Model (Excel → Prisma mapping)

### `Backlog` sheet → `Hypothesis`

| Excel column | Prisma field | Notes |
|---|---|---|
| *(none — added)* | `name` | short title, doesn't exist in source (source only had the long text); added so the Backlog list has something scannable, by analogy with `Experiment.name` |
| Hypothesis | `text` | |
| Funnel Level | `funnelLevelId` → `FunnelLevel` | messy source data, normalized into a table |
| Conversion | `conversion` | enum `CR` / `LTV` / `CR_LTV` |
| Impact (1-5) | `impact` | fixed 1–5 scale |
| Effort | `effort` | fixed 1–5 scale, same widget as Impact — source data only ever used 1–4, confirmed by user to be the same kind of scale, not a free number |
| % Traffic (Reach) | `reach` | |
| Confidence in estimation (%) | `confidence` | |
| Score | *(derived, not stored)* | `impact * confidence * reach / effort` |
| ToDo status | `status` | enum, default `NEW` (source default was "New") |
| Result | `result` | free text |
| Comment | `comment` | |
| Моделирование | `modeling` | |
| Выборка (users) | `sampleSize` | |
| Task | `taskUrl` | Linear link |

### Backlog form field types (UI)

- **Fixed choice:** Conversion (3-way segmented control), Impact (1–5
  button group), Effort (1–5 button group, same widget as Impact),
  Status (dropdown/badge).
- **Combobox (pick existing or add new):** Funnel Level.
- **Free text:** Name (short), Hypothesis text (long/textarea), Result,
  Comment, Моделирование, Выборка, Task URL.
- **Free number:** Reach (%), Confidence (%).
- **Computed, read-only:** Score.

### Backlog screen layout

- List view: table sorted by Score desc. Columns: **Name, Status,
  Score, Comment**.
- Clicking a row's Name navigates (full page, not a panel) to
  `/backlog/[id]`, a detail view laid out close to the original Excel
  row — all fields visible and labeled, not redesigned into a minimal
  card.

### `График экспериментов` sheet → `Experiment`

| Excel column | Prisma field | Notes |
|---|---|---|
| Эксперимент | `name` | |
| Статус | `status` | enum `DEV` / `EXPERIMENT` / `DONE` |
| Автор | `author` | |
| Таргетинг | `targeting` | |
| Segment | `segment` | |
| (week columns F..AF, stage as cell value) | `startDate`, `endDate`, `stage` | replaced with real dates + a stage enum, see Core Data Rules |
| *(none — added)* | `hypothesisId` (required) | every experiment must belong to a hypothesis; see Core Data Rules |

`Email step ideas` sheet was not migrated (unrelated link list, per user
confirmation to skip it unless told otherwise).

## Local Development

Database is a local `npx prisma dev` Postgres instance (not Docker, not
cloud) — zero-config, runs in-process. It is **not persistent across
machine restarts as a service**: if `DATABASE_URL` connection fails,
run `npx prisma dev` again (it reuses the same local data). Connection
strings live in `.env` (gitignored).

**Schema sync: `prisma db push`, not `prisma migrate dev`, for now.**
`prisma dev`'s embedded shadow database is created from a Postgres
`template1` that already has our schema applied, so `migrate dev`
reliably fails with "type already exists" (P3006) — the shadow DB
inherits the very objects it's trying to create. Workarounds (resetting
the shadow DB) don't stick since it's recreated the same way next run.
Until this project has real data and needs a reviewable migration
history (i.e. before the first real deploy), use `npx prisma db push`
to sync schema changes — no shadow DB involved, no migration files. A
proper migration history can be baselined from the schema at that
point with `prisma migrate diff` / `migrate resolve`.

## Documentation Map

- `docs/PROJECT_CONTEXT.md` (this file) — project map, read first.
- `docs/backlog/` — active work, split by area. See
  `docs/backlog/WORKFLOW.md` for the rules.
- `docs/VERSIONS.md` — release/change log.
- `CLAUDE.md` (repo root) — working rules for Claude Code in this repo.

## When To Update This File

Update when: a new screen ships, the data model changes, or a core data
rule (like the Score/derived-value rule above) changes.
