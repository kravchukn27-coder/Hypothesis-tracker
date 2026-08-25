# Hypothesis Tracker

Internal web app for tracking growth hypotheses (Backlog), the
experiments that test them, and a week-by-week Calendar of experiment
stages. Replaces a Google Sheet that was the previous source of truth.

- **Backlog** — `/backlog` — hypotheses with an auto-computed Score
  (`impact × confidence × reach ÷ effort`, never stored).
- **Experiments** — `/experiments/[id]` — spun off from a hypothesis
  (one per hypothesis, at most), one merged status/stage field,
  tag-based targeting (Funnel Level, Product, Segment — Platform/
  Channel/Market existed briefly and were removed, PROD-035). No
  standalone list route — reachable from a Backlog row or Calendar's
  "Показать все эксперименты" table.
- **Calendar** — `/calendar` — week-granularity grid of experiment
  stages, drag to move/resize.
- **Users** — `/users` — list of active accounts and an invite form.

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for the full
project map (data model, screen behavior, origin-data mapping) and
[`docs/CANONICAL_RULES.md`](docs/CANONICAL_RULES.md) for domain
invariants. Active work lives in [`docs/backlog/`](docs/backlog/).

## First run (new team / fresh handoff)

This repo ships with no data and no accounts — the database was wiped
before handoff. There is no default login. Follow "Getting Started"
below in order: step 2 is where you pick your own
`BOOTSTRAP_EMAIL`/`BOOTSTRAP_PASSWORD` (any values — they just need to
match between `.env` and what you type into `/login`), and step 4
creates that account. After logging in, invite teammates from
`/users` — see "Registration flow" further down.

## Tech Stack

- Next.js (App Router), TypeScript
- Tailwind CSS
- Prisma + PostgreSQL

## Getting Started

1. Start a local Postgres instance with `npx prisma dev` (zero-config,
   runs in-process; not a Docker container or persistent service — if
   `DATABASE_URL` stops connecting, just run it again).
2. Create `.env` (gitignored) with at least:

   ```
   DATABASE_URL=...
   SESSION_SECRET=...        # random, 32+ chars — signs session cookies
   BOOTSTRAP_NAME=...
   BOOTSTRAP_EMAIL=...
   BOOTSTRAP_PASSWORD=...
   ```

   In production, also configure the canonical public app origin. Invite and
   password-reset links always use this value rather than request headers:

   ```
   APP_BASE_URL=https://tracker.example.com
   ```

   Optional, enables Telegram alerts on new/spiking server errors (see
   Logging below):

   ```
   MONITOR_TELEGRAM_BOT_TOKEN=...
   MONITOR_TELEGRAM_CHAT_ID=...
   ```

   Optional, logs every Prisma query as a `prisma.query` line (noisy —
   leave unset day-to-day):

   ```
   PRISMA_QUERY_LOG_ENABLED=true
   ```

3. Sync the schema: `npx prisma db push` (not `prisma migrate dev` —
   see [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) → Local
   Development for why).
4. Create the first account: `npm run db:seed`. It's safe to re-run —
   it only creates a user if `BOOTSTRAP_EMAIL` doesn't already exist.
5. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Every page other than `/login` and one-time `/invite/[token]` links
requires a signed session cookie (`src/proxy.ts`) — see Authentication
below for how accounts past the bootstrap user get created.

## Moving Local Data to Production

The local `npx prisma dev` database lives only on your machine — it's
not part of the repo, and it has no automatic link to whatever
database gets provisioned for a production deploy. Data entered
locally does **not** show up on the server just because the code gets
deployed there.

- **If a production/staging Postgres instance doesn't exist yet**
  (the current situation): keep working against the local database as
  usual, then hand off a dump when the server is ready:

  ```bash
  pg_dump --format=custom --file=hypothesis-tracker.dump "$DATABASE_URL"
  ```

  Once the developer has a production `DATABASE_URL` (and has run
  `npx prisma db push` against it so the schema exists), restore into
  it:

  ```bash
  pg_restore --clean --if-exists --no-owner --dbname="$PROD_DATABASE_URL" hypothesis-tracker.dump
  ```

- **If a production/staging Postgres instance is already provisioned
  and reachable** from your machine, it's simpler to skip the dump/
  restore step entirely: point your local `.env`'s `DATABASE_URL` (and
  `APP_BASE_URL`, so invite links use the right domain) at it directly
  and enter data straight into the real database from the start.

Either way, treat this as a manual, one-time step to hand off — there
is no scripted export/import in this repo.

## Authentication

- Local email/password accounts, no third-party auth provider
  (scrypt hashing, `src/lib/auth/password.ts`).
- **No self-service signup.** Every account starts as an invite —
  there is no public registration form.
- Sessions are a signed cookie (`SESSION_SECRET`), 7-day expiry,
  verified on every request by `src/proxy.ts` (Next.js middleware),
  except on `/login`, `/invite/*`, `_next/`, and `api/`.
- `/login` is rate-limited per account/IP (`src/lib/auth/login-rate-limit.ts`,
  backed by the `LoginRateLimitBucket` table).

### Registration flow (invite → account)

1. Any already signed-in user opens `/users` and submits an email in
   the invite form → `createInvite` (`src/lib/auth/invite-actions.ts`).
2. `issueInvite` (`src/lib/auth/invites.ts`) creates the `User` row
   right away (placeholder `name`, no `passwordHash` yet) plus a
   single-use `PasswordSetupToken`, and returns a link:
   `{APP_BASE_URL}/invite/{token}`. **The app sends no email** — the
   inviter copies the link and shares it manually (Slack, etc.). Until
   the link is used, `/users` shows the account as "Ожидает пароля"
   (`passwordHash` is still `null`).
3. The invitee opens the link and submits name + password at
   `/invite/[token]` → `setPasswordFromInvite`, which calls
   `consumeInvite`. This sets `name`/`passwordHash`, marks the token
   used, and invalidates any other outstanding tokens for that user —
   all in one transaction, so the token can't be replayed.
4. The invitee is redirected to `/login` and signs in normally →
   `loginAsUser` (`src/lib/auth/actions.ts`) verifies the password,
   sets the session cookie, and writes an `AuditLog` entry
   (`LOGIN_SUCCESS`/`LOGIN_FAILURE`).

Password resets reuse the same token mechanism (`issuePasswordReset` →
same `/invite/[token]` UI) — there's no separate "forgot password"
flow; a teammate issues a fresh token for the account instead. Invite/
reset tokens expire after 24h (`INVITE_TTL_MS`). Every mutating Server
Action also re-checks `getCurrentUser()` itself rather than relying
only on the middleware — see `docs/PROJECT_CONTEXT.md` → "Auth &
Logging" for the full rationale.

## Logging & Monitoring

- `src/lib/log.ts` — structured JSON logging (`logInfo`/`logWarn`/`logError`)
  to stdout, with a correlation ID helper for tracing one operation
  across log lines. Metadata is redacted before it's logged or stored
  (`src/lib/audit-metadata-redaction.ts` strips anything matching
  `password|token|secret|cookie|authorization|session`).
- `src/lib/error-events.ts` — server errors are deduplicated by a
  signature (error name + route + normalized message) into the
  `ErrorEvent` table, so repeated occurrences of the same error count
  up instead of flooding logs.
- `src/lib/telegram-alert.ts` — when `MONITOR_TELEGRAM_BOT_TOKEN` and
  `MONITOR_TELEGRAM_CHAT_ID` are set, a brand-new error signature or a
  rate spike (10+ in 5 minutes, 30-minute cooldown) posts a Telegram
  alert. Without those env vars, alerting is a no-op — logging still
  works.
- `src/lib/audit-log.ts` — separate from error logging: writes
  user-attributed actions to the `AuditLog` table (`writeAuditLog`/
  `safeWriteAuditLog`, the latter never throws — a failed audit write
  is itself logged as an error instead of breaking the caller).

## Verification

- `npm run lint` / `tsc --noEmit` before committing.
- `npm test` — Vitest unit tests (co-located `*.test.ts` files, mainly
  under `src/lib/`).
- `npm run verify:auth` — scripted smoke check of the auth core
  (`scripts/verify-auth-core.ts`); run after touching anything under
  `src/lib/auth/`.
- `npm run verify:db-timeout` — confirms `DATABASE_URL` connection
  failures time out instead of hanging (`scripts/verify-db-timeout.ts`).
- UI-facing changes should be checked against a running dev server —
  see `CLAUDE.md` for the project's task workflow.
