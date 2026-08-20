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

Authentication uses local email/password accounts. Every app page is protected
by the signed-session proxy; `/login` and one-time `/invite/[token]` password
setup links are the public entry points. Any authenticated user can issue an
invite manually; the app sends no email. See "Auth & Logging" below for
details on both — they shipped together and share the same redaction layer.

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
   anymore. A week-tracked experiment's detail card also links directly
   to its focused Calendar view, opening a window from the first planned
   week. The focused view shows only that experiment and has an explicit
   control to return to the full Calendar without losing the week window.
3. **Calendar** ✅ — `/calendar`, week-granularity grid (PROD-019,
   2026-08-08 — day-granularity per PROD-014/016/017 was a
   misunderstanding of the domain, since experiment stages actually
   progress by week, not by day). Nearest 8 weeks, forward/back paging
   by 1 week, "Сегодня" reset. Each week is its own cell per
   experiment row, individually clickable to set that week's stage
   (`ExperimentWeekRow.tsx`) — including re-picking the same stage to
   mean "continued into this week." Drag-to-move (shift a block of
   weeks) and drag-to-resize (extend/shrink the end) both work at
   week granularity. Same per-week editing is also available from
   `/experiments/[id]` (`ExperimentWeekStagesEditor.tsx`), not
   calendar-only. Dragging an undated experiment from "Без дат" onto a
   week header schedules it there (Discovery default). Row's name
   links to the experiment (`/experiments/[id]`), hypothesis subtitle
   links to the hypothesis (`/backlog/[id]`).
4. **Extras** ✅ — custom funnel-level tags (already supported via the
   Backlog form's Funnel Level select+add, UI-001), and list
   filter/sort on Backlog and Experiments (PROD-004, PROD-007,
   PROD-008), see below.
5. **Users** ✅ — `/users`, list of active accounts (name, email, who
   invited them, "Активен"/"Ожидает пароль" from whether
   `passwordHash` is set yet) plus an invite form. No self-service
   signup — every account starts as an invite issued by an already
   signed-in user (`src/lib/auth/invite-actions.ts`), consumed once at
   `/invite/[token]` to set a password. See "Auth & Logging" below.

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
  matching how Funnel Level already works. For week-tracked experiments,
  the Status filter uses the same current-week stage as the pill and row
  color; legacy experiments continue to use their scalar `stage`.
  Experiments never had a sort dropdown, so PROD-007 didn't
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
  (context-appropriate label, not a different field). **Revisited by
  PROD-019 (2026-08-08):** the user clarified that stage genuinely
  does progress week-by-week in practice (Discovery might run 2+
  weeks, then Design, etc.) — TECH-002 was right that *status* and
  *stage* aren't two different concepts, but wrong to assume a single
  snapshot value was enough. New `ExperimentWeekStage` table
  (`experimentId`, `weekStart`, `stage`, `completed`) is now the source of truth
  for progress; `Experiment.stage`/`startDate`/`endDate` are a
  **derived cache** — automatically recomputed from the latest/
  earliest/latest week entries (`recomputeExperimentDerivedFields` in
  `src/app/experiments/actions.ts`) whenever a week entry changes. If
  the last week is deleted, it resets to Discovery with no dates, so
  every existing query/filter/sort/badge across the app (list Status
  column, filters, `StageCell`) keeps working unchanged without
  needing to know about weeks at all. Once an experiment has week
  entries, its remaining manual date controls (the form's Status/date
  fields) stay read-only — both client-side (a `locked` prop) and
  server-side (`updateExperimentDates` no-ops if week entries exist).
  **BUG-005 (2026-08-09):** the list's Status pill (`StageCell`) was
  also locked this way at first, then confirmed with the user to stay
  editable instead. `ExperimentWeekStage` stays the single source of
  truth though — editing the pill for a week-tracked experiment writes
  through to a week row (via `getCurrentWeekStage`/
  `updateExperimentStage`, see below) and then runs
  `recomputeExperimentDerivedFields`, rather than writing
  `Experiment.stage` directly, so the edit shows up on the Calendar
  too instead of forking into a second, disconnected value. The list
  shows and edits *this week's* status specifically, not
  `Experiment.stage` (which stays "the furthest-future planned
  stage," its original PROD-019 meaning, used unchanged for the
  Experiments Status *filter*/sort fallback and non-week-tracked
  experiments). `getCurrentWeekStage` (`src/lib/experiment.ts`) picks
  the week entry covering "now" (closest earlier week if this week has
  no entry of its own, or the earliest entry if every week is still in
  the future); the Experiments list (`page.tsx`) uses it for the
  pill's value, the row's border color, and "Status" column sorting,
  and `updateExperimentStage` upserts at `startOfWeek(new Date())`
  rather than the last week — so editing the list's Status pill moves
  Calendar's *current*-week cell for that experiment, not its last
  one. `/calendar` (`page.tsx`) also switched its PROD-023 "hide a Done
  experiment" visibility check to the same `getCurrentWeekStage` value
  instead of `Experiment.stage` — otherwise an experiment pre-filled
  through to a future Done week stayed hidden even after its current
  week was edited back off Done. `calendarHiddenOnDone` (the "убрать
  из календаря?" answer) resets back to `null` whenever an
  experiment's current week moves off Done
  (`clearHiddenFlagIfNoLongerDone` in `actions.ts`), so a later
  genuine Done transition prompts again instead of reusing a stale
  answer.
  Existing experiments with `startDate`/`endDate` but no week entries
  yet (not re-tagged since PROD-019) render on the Calendar via
  on-the-fly synthesis (`buildTimeline` in `src/lib/calendar.ts`, not
  persisted) rather than forcing a backfill on every read path.
  **TECH-004 follow-up (2026-08-10):** creation (`/experiments/new`)
  no longer feeds this legacy path going forward — it picks a starting
  week instead (client-snapped to that week's Monday), creating one
  `ExperimentWeekStage` entry directly (`createExperiment` in
  `src/app/experiments/actions.ts`) so a new experiment is
  week-tracked from birth, or undated if left blank. The
  `startDate`/`endDate` scalar fields stay in the schema purely as the
  derived cache and for pre-existing experiments that predate this.
  **PROD-025 (2026-08-10):** `ExperimentWeekStage.completed` records
  that one specific week's stage has been explicitly completed; it
  does not change the experiment's overall stage. Calendar reminders
  use the same gap rule as their red outline: the latest real week
  entry is before the current week, the current week has no entry, and
  that latest entry is not completed. Legacy date-only experiments
  never trigger this reminder.
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
  `src/app/experiments/actions.ts` also updates the `Hypothesis` row).
  The inverse is also automatic: deleting the last experiment resets
  its hypothesis to `NEW`, while deleting one of several leaves its
  status unchanged — experiment presence and this lifecycle status
  cannot drift apart.

## Auth & Logging

Shipped together (in-progress work referenced by UI-042's VERSIONS.md
entry, now landed) since alerts and audit trails need to know which
user triggered them.

### Authentication

- Local email/password accounts (`User.passwordHash`, scrypt via
  `src/lib/auth/password.ts`) — no OAuth/SSO provider.
- No self-service signup. An already signed-in user issues an invite
  from `/users` (`src/lib/auth/invite-actions.ts`); the app sends no
  email, so the link is shared manually. The recipient sets their
  password once at `/invite/[token]` (`src/lib/auth/invites.ts`) — the
  token is single-use and the account has no `passwordHash` until then
  (`/users` shows it as "Ожидает пароля").
- Sessions are a signed cookie (`SESSION_COOKIE_NAME`,
  `src/lib/auth/config.ts`), 7-day expiry, verified by
  `src/proxy.ts` (Next.js middleware) on every request except
  `/login`, `/invite/*`, `_next/`, and `api/`. `SESSION_SECRET` (env,
  32+ chars) signs the token (`src/lib/auth/token.ts`); rotating it
  invalidates every session at once.
- `/login` is rate-limited per account/IP
  (`src/lib/auth/login-rate-limit.ts`, backed by the
  `LoginRateLimitBucket` table) to slow down credential-stuffing.
- `session-version.ts` lets a session be invalidated server-side
  (e.g. on password change) without needing `SESSION_SECRET` rotated
  for everyone.
- **Server Action authorization rule (TECH-043, 2026-08-20):** every
  mutating Server Action in `backlog/actions.ts`, `experiments/actions.ts`,
  and `backlog/[id]/comments-actions.ts` calls `getCurrentUser()`
  (directly, or via each file's local `requireAuthenticatedUser()`
  wrapper, which redirects to `/login` when absent) before touching
  Prisma — landed by BUG-016. This is deliberate defense-in-depth, not
  redundant with `src/proxy.ts`: the middleware gates by *route*, so an
  action is only as protected as the page it happens to be bound to;
  calling `getCurrentUser()` inside the action itself gates by
  *action*, regardless of what route it's invoked from. It also
  supplies the identity every mutation needs to attribute its
  `AuditLog`/error-event row to a user. Read-only lookup helpers with no
  state to protect and nothing to attribute (`getFunnelLevels`,
  `getProducts`, `getSegments`, `getAuthors`) are the only exceptions.

### Logging & Monitoring

- `src/lib/log.ts` exports `logInfo`/`logWarn`/`logError`, each
  emitting one structured JSON line to stdout
  (`{level, event, ts, metadata, ...}`). `createOperationCorrelationId`/
  `withOperationCorrelation` thread a UUID through the log lines of one
  operation so they can be grepped together.
- All logged metadata passes through
  `src/lib/audit-metadata-redaction.ts` first — any key matching
  `password|token|secret|cookie|authorization|session` (case-insensitive)
  is replaced with `"[REDACTED]"`, recursively, before it reaches
  stdout or the database. This is the one redaction path shared by
  logging and audit trails, so a sensitive key can't leak through
  either.
- `logError` additionally calls `recordErrorEvent`
  (`src/lib/error-events.ts`), which hashes `(errorName, route,
  normalized message)` into a signature and upserts it into the
  `ErrorEvent` table — repeated occurrences of the same error increment
  a counter instead of creating new rows, so the table stays a
  deduplicated index of *distinct* failures, not a raw log stream.
- Telegram alerting (`src/lib/telegram-alert.ts`) is opt-in via
  `MONITOR_TELEGRAM_BOT_TOKEN`/`MONITOR_TELEGRAM_CHAT_ID` — a no-op if
  unset. It fires on a brand-new error signature, or on a rate spike
  (10+ occurrences within a 5-minute window, with a 30-minute cooldown
  between spike alerts for the same signature) via
  `RATE_ALERT_THRESHOLD`/`RATE_ALERT_WINDOW_MS`/`ALERT_COOLDOWN_MS` in
  `error-events.ts`.
- `src/lib/audit-log.ts` is a separate, deliberately simpler concern:
  user-attributed action history (`AuditLog` table: `event`, `userId`,
  redacted `metadata`), not error tracking. `safeWriteAuditLog` never
  throws — a failed audit write is itself routed through
  `captureServerError` instead of breaking the caller's request.
- `npm run verify:auth` (`scripts/verify-auth-core.ts`) is a scripted
  smoke check of the auth core — run it after touching anything under
  `src/lib/auth/`.

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

### Bootstrap authentication user

After syncing the schema, create the first local account with `npm run db:seed`.
The gitignored `.env` must define `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, and
`BOOTSTRAP_PASSWORD`. The seed hashes the password with scrypt and is safe to
run repeatedly: it creates the user only when that email does not already
exist.

`SESSION_SECRET` must also be set in `.env` to a random value of at least 32
characters. It signs the seven-day authentication session cookies; it must not
be committed or changed casually, since changing it invalidates every session.

## Documentation Map

- `docs/PROJECT_CONTEXT.md` (this file) — project map, read first.
- `docs/backlog/` — active work, split by area. See
  `docs/backlog/WORKFLOW.md` for the rules.
- `docs/VERSIONS.md` — release/change log.
- `CLAUDE.md` (repo root) — working rules for Claude Code in this repo.

## When To Update This File

Update when: a new screen ships, the data model changes, or a core data
rule (like the Score/derived-value rule above) changes.
