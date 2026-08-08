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
2. **Experiments** ✅ — list/edit experiments (status/stage — one merged
   field, see Core Data Rules — author, targeting, segment, dates).
   `/experiments`, `/experiments/[id]`.
   No standalone "create" entry point on this screen — `/experiments/new`
   requires a `?hypothesisId=` query param and redirects to `/backlog`
   without one; see "Hypothesis ↔ Experiment workflow" below. Experiment
   name in the list opens the experiment's own detail/edit page
   (`/experiments/[id]`) — reversed from the original PROD-002 design
   per PROD-010 (2026-08-06): the "Изменить" list link was removed
   since the name click now does the same thing. The path to the
   parent hypothesis is a second step, reached from inside
   `/experiments/[id]` (its "Гипотеза" field links to
   `/backlog/[hypothesisId]`), not the list's primary click target
   anymore.
3. **Calendar** ✅ — `/calendar`, week-granularity timeline computed
   from experiment dates, bars colored by Stage, links to both the
   experiment (`/experiments/[id]`) and its hypothesis
   (`/backlog/[id]`). No drag/resize — dates are edited on the
   Experiments screen; both read the same fields so they stay in sync.
4. **Extras** ✅ — custom funnel-level tags (already supported via the
   Backlog form's Funnel Level select+add, UI-001), and list
   filter/sort on Backlog and Experiments (PROD-004, PROD-007,
   PROD-008), see below.

All planned screens/mechanics are now built. Delete (PROD-005) also
shipped. Remaining work is the visual design pass — see "Current
phase" below.

### List filter/sort (PROD-004, PROD-007, PROD-008)

Both `/backlog` and `/experiments` read filter/sort state from **URL
query params**, not client state — shareable/bookmarkable links, and
the list itself is still a Server Component doing a normal Prisma
query (filters) + in-memory `.sort()` (sort) with the params folded
in. Filtering (`FilterBar`, `src/components/FilterBar.tsx`, a client
component) and sorting (`SortableHeader`,
`src/components/SortableHeader.tsx`, plain server-rendered links, no
JS) are two separate, deliberately non-overlapping mechanisms — see
below for why Backlog only has one of each.

- Backlog: sort via clickable column headers — `?sort=score|status|name`
  (default `score`, default direction `desc`), `?dir=asc|desc`.
  Filters via `FilterBar`: `?funnelLevel=<id>`, `?status=<HypothesisStatus>`.
  **No sort dropdown** — PROD-004 originally added one to `FilterBar`,
  but PROD-007 (2026-08-06) replaced it with header clicks per the
  user's explicit choice: one sort mechanism, not two driving the same
  state out of sync.
- Experiments: sort via clickable column headers —
  `?sortBy=name|stage|author|startDate` (default `startDate`, default
  direction `asc`), `?dir=asc|desc`. Filters via `FilterBar`:
  `?stage=<ExperimentStage>` (labeled "Status" in the UI, same merged
  field as everywhere else post-TECH-002), `?segment=<value>`,
  `?author=<value>` — Автор is a free-text DB column, Segment is a tag
  relation (`Segment.id` as the filter value, since 2026-08-07's
  follow-up to TECH-003), but each filter is still a `<select>` of the
  *distinct existing values* in the data, not a text search box,
  matching how Funnel Level already works. Experiments never had a sort dropdown, so PROD-007 didn't
  need to remove anything there — just added headers and switched the
  Prisma `orderBy` to the same in-memory sort so there's one code path.
- A "Сбросить" link (from `FilterBar`) appears once any *filter* field
  differs from its default and clears the query entirely — sort state
  is separate from this and represented by the active `SortableHeader`
  arrow, not the reset link.

**Current phase: mechanics, not visual design.** All three core screens
exist but styling is intentionally a plain Tailwind/zinc placeholder —
the user wants remaining mechanics finished across all screens first,
then a single real design pass over everything at once (agreed
2026-08-06), rather than restyling once now and again after Calendar
changes shape things.

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
  Backlog card (see PROD-002). Consequence for delete (PROD-005,
  2026-08-06): deleting a hypothesis is **blocked** while it still has
  experiments, with an explicit error message stating the count and
  telling the user to delete those experiments first — no cascade,
  since that could silently destroy experiment data. Deleting an
  experiment has no such restriction.
- Experiment date model replaces the spreadsheet's "one column per
  week, stage name as cell value" layout with real `startDate`,
  `endDate`, so the Calendar screen can be computed instead of
  hand-shifted between columns.
- `Experiment` has **one** status/stage field (`stage`), not two. The
  original Excel modeled these as separate concepts (`Статус`:
  Dev/Experiment/Done, and a week-by-week stage cell:
  Discovery/Design/Development/Experimentation/Analysis) — the user
  identified this as a spreadsheet-era mistake, not a real distinction
  (TECH-002, 2026-08-06). Merged enum `ExperimentStage`: Discovery /
  Design / Development / Experimentation / Analysis / Done, required,
  default `DISCOVERY`. Same field, same colors everywhere; labeled
  "Status" in the Experiments list/form, "Stage" in the Calendar
  (context-appropriate label, not a different field).
- `Experiment.targeting` (free text, e.g. `"GW, квиз"`) was **removed**
  (TECH-003, 2026-08-07) — it was a flattened mix of 5 distinct tag
  categories from the source tool. Replaced with 5 real many-to-many
  relations on `Experiment`: `funnelLevels` (reuses the existing
  `FunnelLevel` table, previously Hypothesis-only), `platforms`,
  `channels`, `markets`, `products` (new tables, same shape as
  `FunnelLevel`: `id`, `name` unique, `isCustom`, `createdAt`). Each is
  multi-select (several tags at once per category, confirmed by the
  user over the single-FK alternative) via Prisma implicit
  many-to-many, edited through the new `TagMultiSelect` component
  (chips + select-existing/add-new, one per category, each in its own
  badge color — see `src/lib/tags.ts`). Existing `targeting` free-text
  values were **not** backfilled into the new fields (confirmed
  data-loss tradeoff, no automatic mapping was possible from free text
  to structured tags) — existing experiments start with all 5 fields
  empty unless re-tagged by hand. The existing `"Квиз"` FunnelLevel
  value was renamed to `"Quiz"` as part of this same change (English
  translations for the whole category, confirmed by the user) — a
  rename, not a new row, so existing `"Квиз"`-tagged hypotheses now
  read `"Quiz"`.
- `Experiment.segment` (also free text originally) was converted the
  same way (2026-08-07 follow-up, same day) into a 6th multi-select
  tag category — a real `Segment` table + many-to-many relation,
  `TagMultiSelect`-edited like the other 5. Unlike `targeting`,
  existing `segment` string values *were* cleanly backfilled (a
  1-string-to-1-tag mapping is unambiguous, unlike targeting's
  flattened 5-category mess) — one `Segment` row created per distinct
  existing value, connected to the experiments that had it, before the
  old column was dropped. The Experiments list's Segment column now
  joins the related tag names (`", "`-separated) instead of reading a
  scalar field. Also moved: "Автор" now lives in the Experiment form's
  "Основное" section instead of "Таргетинг" (user request, same day).

### Hypothesis ↔ Experiment workflow

Confirmed by the user 2026-08-06 — experiments are not a standalone
list you add to; they're something you spin off *from* a hypothesis:

- Creating a hypothesis redirects back to the `/backlog` **list**, not
  to the new hypothesis's detail page — the list is the home base.
- Status is edited **inline in the Backlog list** (a dropdown right in
  the row, `StatusCell`), not only via the full edit form.
- There is no "+ New experiment" button on `/experiments` at all.
  `/experiments/new` only works with a `?hypothesisId=` query param
  (redirects to `/backlog` otherwise) and the hypothesis is fixed in
  that form (shown as a link, submitted as a hidden field) — not a
  picker. Entry points into it: the "Создать эксперимент" button on a
  hypothesis's `/backlog/[id]` page, and the status-change prompt
  below.
- Backlog row action (PROD-011, 2026-08-06) is conditional on whether
  the hypothesis already has experiments: none yet → "Создать
  эксперимент" link into the create flow above; has experiments →
  "→ Эксперимент" link into `/experiments?hypothesisId=...`, which
  highlights (amber background, `data-highlighted="true"`) **every**
  experiment belonging to that hypothesis (not just one — a hypothesis
  can have several, see PROD-006) and auto-scrolls the first one into
  view (`ScrollToHighlighted` client component). No filtering — the
  full list stays visible, just visually pointing at the relevant rows.
- Whenever a hypothesis's status changes via the list's inline
  dropdown, and that hypothesis has **no experiments yet**, and the new
  status isn't `NEW`, a modal prompts "Перевести в эксперимент?" with a
  direct link into `/experiments/new?hypothesisId=...`. This is a
  suggestion, not automatic — dismissible, and only fires once per
  status change (not repeated nagging once an experiment exists).
- Creating an experiment from a hypothesis automatically sets that
  hypothesis's status to `IN_PROGRESS` (`createExperiment` in
  `src/app/experiments/actions.ts` also updates the `Hypothesis` row) —
  the reciprocal link the user asked for: converting to an experiment
  is itself a status transition, not just a side effect.

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
- **Select + add new (like Status, not a free-typing combobox):**
  Funnel Level — `<select>` of existing `FunnelLevel` names plus a
  "+ Добавить новый..." option that swaps in a text input (with
  Cancel back to the select), see `FunnelLevelField` in
  `HypothesisForm.tsx` (UI-001). The submitted form field is always
  named `funnelLevel` either way — the server action's upsert-by-name
  logic didn't need to change.
- **Free text:** Name (short), Hypothesis text (long/textarea), Result,
  Comment, Моделирование, Выборка, Task URL.
- **Free number:** Reach (%), Confidence (%).
- **Computed, read-only:** Score.

### Backlog screen layout

- List view: table sorted by Score desc. Columns: **Name, Status
  (inline-editable), Score, Comment**, plus a "→ Эксперимент" row
  action. See "Hypothesis ↔ Experiment workflow" above.
- Clicking a row's Name navigates (full page, not a panel) to
  `/backlog/[id]`, a detail view laid out close to the original Excel
  row — all fields visible and labeled, not redesigned into a minimal
  card. That page also has a persistent "Создать эксперимент" button.
- Form field order: Name, Hypothesis text, Funnel Level/Status,
  Conversion, Impact/Effort, Reach/Confidence, **Score** (sits right
  after the four inputs that compute it, not pinned above the form —
  UI-001), then Result (if Done)/Comment/Моделирование/Выборка/Task.
- Creating a hypothesis redirects to the `/backlog` list, not to the
  new hypothesis's own detail page.

### `График экспериментов` sheet → `Experiment`

| Excel column | Prisma field | Notes |
|---|---|---|
| Эксперимент | `name` | auto-generated on create (PROD-006, 2026-08-06): hypothesis name, +" N" for the Nth+1 experiment off the same hypothesis; editable afterward on `/experiments/[id]` |
| Статус | `stage` | merged with the week-column stage into one field, see Core Data Rules (TECH-002) |
| Автор | `author` | |
| Таргетинг | `funnelLevels`/`platforms`/`channels`/`markets`/`products` | originally one free-text field; split into 5 many-to-many tag relations (TECH-003, 2026-08-07), see Core Data Rules |
| Segment | `segments` | originally free text; converted to a many-to-many tag relation with backfill (2026-08-07 follow-up to TECH-003), see Core Data Rules |
| (week columns F..AF, stage as cell value) | `startDate`, `endDate`, `stage` | dates replace the week columns; stage cell value merged into the same `stage` field as the old `Статус` column, see Core Data Rules |
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
