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

1. **Backlog** — list/create/edit hypotheses, auto-computed Score, status.
2. **Experiments** — list/create/edit experiments (status, author,
   targeting, segment, dates, stage).
3. **Calendar** — timeline/Gantt view of experiments driven by
   `startDate`/`endDate`/`stage`, replacing the Excel week-column hack.
4. **Extras** — custom funnel-level tags, filters/sorting.

Only screen 1 exists so far; this file will be updated as later screens
land.

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
| Hypothesis | `text` | |
| Funnel Level | `funnelLevelId` → `FunnelLevel` | messy source data, normalized into a table |
| Conversion | `conversion` | enum `CR` / `LTV` / `CR_LTV` |
| Impact (1-5) | `impact` | |
| Effort | `effort` | |
| % Traffic (Reach) | `reach` | |
| Confidence in estimation (%) | `confidence` | |
| Score | *(derived, not stored)* | `impact * confidence * reach / effort` |
| ToDo status | `status` | enum, default `NEW` (source default was "New") |
| Result | `result` | free text |
| Comment | `comment` | |
| Моделирование | `modeling` | |
| Выборка (users) | `sampleSize` | |
| Task | `taskUrl` | Linear link |

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

## Documentation Map

- `docs/PROJECT_CONTEXT.md` (this file) — project map, read first.
- `docs/backlog/` — active work, split by area. See
  `docs/backlog/WORKFLOW.md` for the rules.
- `docs/VERSIONS.md` — release/change log.
- `CLAUDE.md` (repo root) — working rules for Claude Code in this repo.

## When To Update This File

Update when: a new screen ships, the data model changes, or a core data
rule (like the Score/derived-value rule above) changes.
