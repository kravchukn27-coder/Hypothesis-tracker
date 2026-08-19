# Hypothesis Tracker

Internal web app for tracking growth hypotheses (Backlog), the
experiments that test them, and a week-by-week Calendar of experiment
stages. Replaces a Google Sheet that was the previous source of truth.

- **Backlog** — `/backlog` — hypotheses with an auto-computed Score
  (`impact × confidence × reach ÷ effort`, never stored).
- **Experiments** — `/experiments` — spun off from a hypothesis, one
  merged status/stage field, tag-based targeting (Funnel Level,
  Platform, Channel, Market, Product, Segment).
- **Calendar** — `/calendar` — week-granularity grid of experiment
  stages, drag to move/resize.
- **Users** — `/users` — list of active accounts and an invite form.

See [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) for the full
project map (data model, screen behavior, origin-data mapping) and
[`docs/CANONICAL_RULES.md`](docs/CANONICAL_RULES.md) for domain
invariants. Active work lives in [`docs/backlog/`](docs/backlog/).

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

   Optional, enables Telegram alerts on new/spiking server errors (see
   Logging below):

   ```
   MONITOR_TELEGRAM_BOT_TOKEN=...
   MONITOR_TELEGRAM_CHAT_ID=...
   ```

3. Sync the schema: `npx prisma db push` (not `prisma migrate dev` —
   see [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) → Local
   Development for why).
4. Create the first account: `npm run db:seed`. It's safe to re-run —
   it only creates a user if `BOOTSTRAP_EMAIL` doesn't already exist.
5. `npm run dev` and open [http://localhost:3000](http://localhost:3000).

Every page other than `/login` and one-time `/invite/[token]` links
requires a signed session cookie (`src/proxy.ts`). Any authenticated
user can invite another from `/users` — the app sends no email, so
share the invite link manually.

## Authentication

- Local email/password accounts, no third-party auth provider.
- Sessions are a signed cookie (`SESSION_SECRET`), 7-day expiry,
  verified on every request by `src/proxy.ts`.
- `/login` is rate-limited per account/IP (`src/lib/auth/login-rate-limit.ts`).
- Invites are one-time tokens (`src/lib/auth/invites.ts`) — any signed-in
  user can issue one from `/users`; the recipient sets their own
  password at `/invite/[token]`.

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
- `npm run verify:auth` — scripted check of the auth core
  (`scripts/verify-auth-core.ts`).
- UI-facing changes should be checked against a running dev server —
  see `CLAUDE.md` for the project's task workflow.
