# Tech Backlog

## TECH-015 — Extend AuditLog to general domain actions, plus a log viewer

- **Status:** TODO
- **Priority:** Medium
- **Area:** Observability
- **Type:** Feature
- **Summary:** `AuditLog` (already in `prisma/schema.prisma`) is only ever written from `src/lib/auth/actions.ts` for 4 auth events (`LOGIN_SUCCESS`/`LOGIN_FAILURE`/`LOGOUT`, plus invite events in `auth/invites.ts`) — extend it to general domain mutations (create/archive hypothesis, change experiment stage, etc.) and add a read-only viewer.
- **Description:**
  Ported principle from `battery-pricing-app`'s `src/lib/audit-log.ts` (`writeAuditLog`/`safeWriteAuditLog`), **not** its exact schema — this app's `AuditLog` model is already simpler (`event`, `userId`, `metadata`, `createdAt`; no `action`/`entityType`/`entityId`/`result` columns like the source), and that's a deliberate existing choice worth keeping rather than reshaping the table to match the source app. Identify the mutated entity via `event` string naming (e.g. `HYPOTHESIS_CREATED`, `HYPOTHESIS_ARCHIVED`, `EXPERIMENT_STAGE_CHANGED`) plus `metadata` (entity id, before/after values) instead of dedicated columns.

  Work:
  1. Extract the local `writeAuditLog` helper out of `src/lib/auth/actions.ts` into a shared `src/lib/audit-log.ts`, generalized to accept any `event` string (not just the auth-only union type it currently has) and reusing TECH-013's `redactSensitiveAuditMetadata` for the `metadata` field. `auth/actions.ts`/`auth/invites.ts` switch to importing the shared helper instead of keeping their own copy.
  2. Call the shared helper from domain mutation actions after they succeed — `backlog/actions.ts` (create/update/archive/delete hypothesis, status change), `experiments/actions.ts` (create/archive experiment, week-stage changes). Scope of exactly which mutations get logged is a call to make at implementation time — start with the ones that already write `AuditLog` for auth as the density reference, not every single field edit.
  3. A read-only viewer page (e.g. under `/users` — the closest existing admin-ish surface — or a new route) listing both `AuditLog` and TECH-013's `ErrorEvent` rows, filterable by user/event/date, matching source app's `/settings/audit-log`+`/settings/error-log` viewers in spirit but as one simpler screen (this app doesn't need two, given expected volume).
- **Acceptance Criteria:**
  - `writeAuditLog` lives in one shared `src/lib/audit-log.ts`, not duplicated between auth and domain call sites.
  - At least hypothesis create/archive and experiment stage changes write an `AuditLog` row with the acting user's id.
  - Sensitive-looking metadata keys (password/token/secret/cookie/authorization/session) are redacted before being persisted, reusing TECH-013's redaction helper.
  - A logged-in user can view a filterable list of audit entries and error events without needing direct DB access.
  - Existing auth audit events (`LOGIN_SUCCESS`/`LOGIN_FAILURE`/`LOGOUT`/invite events) keep working unchanged through the now-shared helper.
  - No `AuditLog` schema change (columns stay `event`/`userId`/`metadata`/`createdAt`) unless a real need for structured `entityType`/`entityId` filtering surfaces during implementation — flag it back to the user before adding columns, don't just port the source schema wholesale.

## TECH-014 — Wire captureServerError into existing server actions

- **Status:** TODO
- **Priority:** Medium
- **Area:** Observability
- **Type:** Chore
- **Summary:** Wrap the `catch` blocks of this app's server actions (`backlog/actions.ts`, `experiments/actions.ts`, `auth/actions.ts`, etc.) with TECH-013's `captureServerError`, so failures actually get logged/tracked instead of just surfacing a generic toast to the user.
- **Description:**
  Depends on TECH-013 (needs `captureServerError` to exist first). Mechanical pass ported from `battery-pricing-app`'s convention (74 call sites there) — after a mutation's `try` block fails, call `captureServerError({ event: "<domain>.<action>.failed", route: "<file/function>", error, userId, metadata })` before returning the existing user-facing error (toast message stays as-is, this is additive, not a UX change).
- **Acceptance Criteria:**
  - Every server action in `backlog/actions.ts` and `experiments/actions.ts` that currently has a bare `catch` (no logging) now also calls `captureServerError` with a distinct `event` name per failure site.
  - Existing user-facing error behavior (toast messages, return values) is unchanged — this only adds logging alongside it.
  - A deliberately-triggered failure (e.g. a bad Prisma call in dev) produces exactly one `ErrorEvent` row, not a duplicate per retry within the same signature window.
  - No change to successful-path behavior anywhere touched.

## TECH-013 — Structured server-side error logging core (ErrorEvent)

- **Status:** TODO
- **Priority:** Medium
- **Area:** Observability
- **Type:** Feature
- **Summary:** Port `battery-pricing-app`'s structured error-logging core — `logInfo`/`logWarn`/`logError`/`captureServerError`, a deduplicated `ErrorEvent` table, and a shared metadata-redaction helper. No auth dependency (`userId` is optional here) — can ship independently of the auth/comment-feed work already in flight.
- **Description:**
  Source: user asked (2026-08-19) to study `battery-pricing-app`'s error/action-logging setup and port the same principle. This card ports the error-logging half; TECH-015 covers the action-logging half (`AuditLog`), which does need a real user, unlike this one.

  Ported as-is from `battery-pricing-app`:
  - `prisma/schema.prisma` — new `ErrorEvent` model (`signature @unique`, `errorName`, `errorMessage`, `route`, `event`, `count`, `firstSeenAt`, `lastSeenAt`, `lastAlertedAt`, `lastUserId`, `lastMetadata`), same shape as source's `prisma/schema.prisma:598-614`.
  - `src/lib/log.ts` — `logInfo`/`logWarn`/`logError` write structured JSON to console (level, event, ISO timestamp, redacted metadata, normalized error name/message/stack); `logError` also calls `recordErrorEvent`. `captureServerError({ event, route, error, userId?, metadata? })` is the one function call sites actually use.
  - `src/lib/error-events.ts` — `recordErrorEvent`: computes a signature (`sha1(errorName|route|normalizedMessage)`, digits/hex-ids stripped from the message so distinct instances of the same failure collapse into one row), creates or increments the matching `ErrorEvent` row, and decides whether a rate-alert should fire (≥10 occurrences in a 5-minute rolling window, 30-minute cooldown between alerts for the same signature). Never throws — a failure in error-tracking itself must not break the caller's actual error handling.
  - `src/lib/audit-metadata-redaction.ts` — shared `redactSensitiveAuditMetadata`, regex on object keys (`password|token|secret|cookie|authorization|session`, case-insensitive) replacing the whole value with `"[REDACTED]"`. Shared with TECH-015's audit-log metadata, not duplicated.
  - Telegram alerting (`sendTelegramAlert`) — optional, ported as-is: reads `MONITOR_TELEGRAM_BOT_TOKEN`/`MONITOR_TELEGRAM_CHAT_ID` from env, silently no-ops if unset. Decide at implementation time whether this app wants it wired up at all, or whether the ported function should just exist unused until someone sets the env vars — either is fine, it costs nothing when unconfigured.
- **Acceptance Criteria:**
  - `npx prisma db push` applies the new `ErrorEvent` model cleanly.
  - Calling `captureServerError` with the same underlying error twice in quick succession increments one `ErrorEvent` row's `count` rather than creating two rows.
  - A genuinely new error signature creates a new `ErrorEvent` row with `count: 1`.
  - Metadata containing a key matching the redaction regex is stored as `"[REDACTED]"`, not the real value.
  - `captureServerError` never throws, even if the DB write inside it fails.
  - No new npm dependency (matches source: Node's built-in `crypto` for the signature hash, native `fetch` for the optional Telegram call).
  - This card ships no UI and no call-site wiring (that's TECH-014) — it's the library layer only.

## TECH-012 — Backlog table: latest-comment preview from the feed

- **Status:** DONE
- **Priority:** Medium
- **Area:** Backlog
- **Type:** Feature
- **Summary:** Backlog's table Comment column keeps showing a truncated single-line preview of the most recent comment — same look as today, just sourced from the new comment feed (TECH-010/011) instead of the old flat `Hypothesis.comment` field.
- **Description:**
  Depends on TECH-010 (schema) and TECH-011 (feed write path — needs comments actually flowing through it to preview). Ported concept: `battery-pricing-app`'s project comment feed has **no equivalent "latest comment" table preview anywhere** (confirmed by search across its codebase) — this card is a fresh design, not a direct port, built to match this app's existing Backlog table UX exactly.

  Two call sites in `src/app/backlog/page.tsx` change, both reading/filtering on `Hypothesis.comment` today:
  - The list query (`prisma.hypothesis.findMany`, ~line 57) adds `comments: { orderBy: { createdAt: "desc" }, take: 1 }` to its `include`; the row-mapping derives `latestComment = h.comments[0]?.message ?? null`.
  - The Comment column's existing truncate+fade-mask+`title` `<Link>` (the same UI-032-era pattern used elsewhere in this table) switches from `h.comment` to `latestComment` — no visual/behavioral change, same click-through to `/backlog/${h.id}`.
  - The search filter (~line 66, `comment: { contains: q, mode: "insensitive" }`) moves to the relation: `comments: { some: { message: { contains: q, mode: "insensitive" } } }`, so searching by comment text still works against the full feed, not just the latest entry.
- **Acceptance Criteria:**
  - Backlog's table Comment column shows the most recent comment for each hypothesis, truncated with a `title` tooltip holding the full text — identical visual treatment to the current implementation.
  - A hypothesis with no comments shows the existing "—" empty state.
  - Search-by-comment-text still matches hypotheses whose *any* comment (not just the latest) contains the query string.
  - No change to Score, Status, or any other Backlog table column/behavior.

## TECH-011 — Comment feed: write path and detail-page UI

- **Status:** DONE
- **Priority:** Medium
- **Area:** Backlog
- **Type:** Feature
- **Summary:** Replace the single "Comment" `Textarea` on `/backlog/[id]` with a comment feed — a list of timestamped, authored entries plus a composer to add a new one, matching `battery-pricing-app`'s project comment feed.
- **Description:**
  Depends on TECH-010 (schema) and TECH-008 (login/session — needs to know who's posting). Ports `battery-pricing-app`'s `ProjectComment` write/read pattern (`src/app/api/projects/[id]/comments/route.ts`, `project-comments-list.tsx`/`project-comments-form.tsx`) with one deliberate simplification: source app restricts comment deletion to the author **and** the same browser session it was posted in (`createdSessionFingerprint` check, a lightweight "undo my recent post" guard). This app's threat model is a small trusted team with no roles, so deletion is simplified to **author-only** (any of your own comments, any session) — no fingerprint field needed.

  Write path: a server action validating non-empty message (trim) and a max length (4000 chars, matching source), creating a `HypothesisComment` row with `authorUserId` from the current session. Comments are immutable — no edit, matching source app. Delete is a separate action, author-ID check only, no admin override (nobody's an admin here).

  Read/display on `/backlog/[id]/page.tsx`: replaces `HypothesisForm`'s `Field label="Comment"` `Textarea` (currently `src/app/backlog/HypothesisForm.tsx` ~line 213) with a feed section — list (newest-first, capped at 40 like source, no pagination) showing author name + timestamp + message, plus a composer (`Textarea`, explicit submit button, no Enter-to-submit — matching source). Empty state: a short placeholder ("Пока нет комментариев" or equivalent) instead of source's dashed-border box, matching this app's existing empty-state style elsewhere.
- **Acceptance Criteria:**
  - Any logged-in user can post a comment on a hypothesis; it appears at the top of the feed immediately (via `router.refresh()` or equivalent, matching source's non-optimistic pattern) with their name and a timestamp.
  - A user can delete their own comments; they cannot delete another user's comment (enforced server-side, not just hidden in the UI).
  - Comments cannot be edited after posting.
  - Empty message (after trim) is rejected; message over 4000 characters is rejected.
  - The old single-field "Comment" input is fully removed from `HypothesisForm`/`ExperimentForm`... [Hypothesis only — `Experiment` has no comment field, not in scope].
  - `docs/CANONICAL_RULES.md`'s hypothesis/experiment invariants are unaffected — this only touches the comment surface.

## TECH-010 — Comment feed: `HypothesisComment` schema and legacy-field removal

- **Status:** DONE
- **Priority:** Medium
- **Area:** Backlog
- **Type:** Data model
- **Summary:** Add a `HypothesisComment` table (feed of authored, timestamped comments per hypothesis) and drop the flat `Hypothesis.comment String?` field.
- **Description:**
  Source: user direction 2026-08-19, after reviewing `battery-pricing-app`'s `ProjectComment` model (`prisma/schema.prisma:275-289`) — same shape, ported directly:
  ```prisma
  model HypothesisComment {
    id           String   @id @default(cuid())
    hypothesisId String
    authorUserId String
    message      String
    createdAt    DateTime @default(now())

    hypothesis Hypothesis @relation(fields: [hypothesisId], references: [id], onDelete: Cascade)
    authorUser User       @relation(fields: [authorUserId], references: [id])

    @@index([hypothesisId])
    @@index([authorUserId])
    @@index([createdAt])
  }
  ```
  No `createdSessionFingerprint` column (see TECH-011 for why — this app skips that guard) and no `updatedAt`/edited flag (comments are immutable, matching source).

  Depends on TECH-006 (`User` table must exist for the `authorUserId` FK) — this card can't ship before auth's data model does.

  **Existing data**: the user explicitly chose to delete the sparse test values in `Hypothesis.comment` rather than migrate them, since they are not production data.
- **Acceptance Criteria:**
  - `npx prisma db push` applies the new model and the dropped `Hypothesis.comment` column cleanly.
  - Existing legacy comment values are deleted rather than migrated, per the user's explicit decision; the new `HypothesisComment` table starts empty.
  - No other Hypothesis/Experiment fields or domain logic touched.

## TECH-009 — Auth: invite-based user creation and password set

- **Status:** DONE
- **Priority:** Medium
- **Area:** Auth
- **Type:** Feature
- **Summary:** Any logged-in user can generate a one-time invite link for a new colleague; the link lets them set their own password and become a full account. No self-service signup, no email sending — the link is generated in the UI and shared manually.
- **Description:**
  Depends on TECH-006 (data model), TECH-007 (auth core lib), and TECH-008 (login/session/middleware) — this is the last layer, the only one that lets new accounts actually get created after the bootstrap user from TECH-006's seed.

  Ported from `battery-pricing-app`'s admin-provisioned account flow (`src/lib/auth/password-setup.ts`, `PasswordSetupToken` model), but flattened for this app's no-roles model: since every user has equal rights (confirmed with the user — "Authors" become individual users with equal rights), **any authenticated user** can issue an invite, not just an admin. This is the one deliberate divergence from the source app, which gated invites to `ADMIN` only.

  Mechanism (same as source): a 32-byte random token is generated, only its sha256 hash is stored (`PasswordSetupToken.tokenHash`), 24h TTL, single-use (`usedAt`). Issuing a new invite for the same target auto-invalidates any previous unused token for them. Consuming the token sets `User.passwordHash` and bumps `User.sessionVersion` (so if this doubles as a password-reset link later, old sessions die). Same token model can be reused for "forgot password" in the future, but self-service password reset is **not** in this card's scope — only invite-driven first-time password set.

  UI: a simple "Пользователи" surface listing active `User` rows (name, email, invited-by) with a "Пригласить" action per new-user form (name + email), producing a link at `/invite/[token]` to copy and send manually. The `/invite/[token]` page is a public route (excluded from `middleware.ts`'s auth gate, alongside `/login`) that validates the token and renders a set-password form.
- **Acceptance Criteria:**
  - Any logged-in user can invite a new colleague by entering a name and email; the system generates a single-use, 24h-expiring token and shows a shareable `/invite/[token]` link — no email is sent by the system.
  - Visiting a valid, unexpired, unused invite link lets the recipient set a password and creates/activates their account; the token cannot be reused afterward.
  - An expired, already-used, or invalidated token shows a clear error, not a working password-set form.
  - Issuing a new invite for someone with an existing unused token invalidates the old one.
  - `AuditLog` gets an `INVITE_ISSUED` entry on issue and a `PASSWORD_SET` entry on successful consumption.
  - No roles are introduced — every account that completes an invite has the same permissions as every other logged-in user.

## TECH-008 — Auth: login, logout, and global route protection

- **Status:** DONE
- **Priority:** Medium
- **Area:** Auth
- **Type:** Feature
- **Summary:** A working `/login` page and logout control, backed by the TECH-007 session library, plus Next.js middleware that requires a valid session on every page except `/login` and (later) `/invite/[token]`.
- **Description:**
  Depends on TECH-006 (data model) and TECH-007 (hashing/session/guards lib) — this card wires that library into actual user-facing routes. Ports `battery-pricing-app`'s `loginAsUser`/`logout` server actions (`src/lib/auth/actions.ts`) and `src/middleware.ts` pattern, roles stripped out (no `requireRole`/`requireAdmin` — just `requireUserPage()`).

  Login flow (same shape as source app): normalize email, look up the user with Postgres's `mode: "insensitive"` (source app's SQLite couldn't do this and had to filter in JS — this app can do it directly in the Prisma query, one genuine simplification over the source), verify password with `timingSafeEqual`, and on either "no such user" or "wrong password" show the **same generic error** (`?error=credentials`) — no signal about which one was wrong, to avoid user enumeration. Every attempt (success or failure, known or unknown email) writes an `AuditLog` row. Failures increment the TECH-006 `LoginRateLimitBucket` for both the requesting IP and the normalized email; 10 failures in a 15-minute rolling window trip a 15-minute cooldown, checked *before* the credential check on every attempt.

  Session cookie: `httpOnly`, `sameSite: "lax"`, `secure` only when the app is actually deployed (not yet — see TECH context, this stays `false` in local dev), 7-day expiry, no "remember me" tier for now (source app's 365-day remember-me was gated to its desktop build, which doesn't apply here). Logout clears the cookie; it does not need to bump `sessionVersion` (that's reserved for forced revocation, e.g. a future password change elsewhere).

  Middleware protects every page route by default (matcher excludes `_next/`, `api/*`, `favicon.ico`, `login`) and redirects unauthenticated visits to `/login?from=<path>`. API routes are not built yet in this app in a way that needs separate guarding — if/when any appear, they self-guard via `requireUser()` from TECH-007, matching the source app's split.
- **Acceptance Criteria:**
  - Visiting any page while logged out redirects to `/login`; after a successful login the user lands back on the page they originally requested (`from` param honored).
  - Wrong email and wrong password both show the identical generic error message.
  - 10 failed attempts from the same IP or same email within 15 minutes blocks further attempts for 15 minutes, independent of which scope tripped it.
  - A logged-in user can log out via a visible control in the header; after logout, the app behaves as logged-out (redirects to `/login` again).
  - `AuditLog` records `LOGIN_SUCCESS`, `LOGIN_FAILURE`, and `LOGOUT` events.
  - No `Experiment.author` behavior changes — login is fully decoupled from that field (confirmed with the user).

## TECH-007 — Auth: password hashing and signed-session core library

- **Status:** DONE
- **Priority:** Medium
- **Area:** Auth
- **Type:** Feature
- **Summary:** The reusable `src/lib/auth/` library — password hashing/verification and HMAC-signed session tokens — with no user-facing routes yet. Pure library layer that TECH-008 and TECH-009 build on.
- **Description:**
  Depends on TECH-006 for the `User`/`sessionVersion` shape. Ports `battery-pricing-app`'s `src/lib/auth/password.ts` and `src/lib/auth/token.ts`/`session.ts` mechanisms as-is — both use only Node/Web-standard `crypto`, **no new npm dependency**:
  - `password.ts`: `scryptSync` with a random 16-byte salt per password, stored as `salt:hash` hex in `User.passwordHash`; verification re-derives with the stored salt and compares via `timingSafeEqual` (constant-time, not `===`).
  - `token.ts`: session payload `{ sub: userId, exp, sv: sessionVersion, sid: sessionInstanceId }`, base64url-encoded and HMAC-SHA256 signed with a key derived from a new `SESSION_SECRET` env var (add to `.env`, document in `docs/PROJECT_CONTEXT.md` → Local Development). No refresh/rotation — fixed absolute expiry, matching source app.
  - `session.ts`: `getCurrentUser()` reads the cookie, verifies the signature and expiry, loads the `User` (must be `isActive: true`), and rejects if `sessionVersion` on the token doesn't match the current DB value (this is how a forced revocation — e.g. deactivating a user — takes effect immediately even for an otherwise-valid, unexpired token).
  - `guards.ts` / `page-guards.ts`: `requireUser()` for future API routes, `requireUserPage()` for server components/pages — both collapsed from source app's role-aware versions since this app has no roles.

  This card ships no routes and is not independently user-visible; it exists so TECH-008 (login/middleware) and TECH-009 (invites) each stay focused on their own flow instead of re-deriving the crypto primitives.
- **Acceptance Criteria:**
  - A password can be hashed and correctly verified round-trip (matching password verifies true, wrong password verifies false) via unit-level exercise (script or test, since this app doesn't currently have live users to test against end-to-end yet).
  - A signed session token can be created, verified as valid, and correctly rejected when: the signature is tampered, `exp` is in the past, or `sv` doesn't match the user's current `sessionVersion`.
  - No new npm dependency added — hashing and signing use Node's built-in `crypto`/Web `crypto.subtle` only.
  - `SESSION_SECRET` is read from `.env` (gitignored) and documented in `docs/PROJECT_CONTEXT.md`.

## TECH-006 — Auth: data model and bootstrap seed

- **Status:** DONE
- **Priority:** Medium
- **Area:** Auth
- **Type:** Data model
- **Summary:** Add the `User`, `PasswordSetupToken`, `LoginRateLimitBucket`, and `AuditLog` Prisma models (ported from `battery-pricing-app`, roles removed) and a one-time seed script that creates the very first account, since nobody exists yet to send an invite.
- **Description:**
  Source: user direction 2026-08-19, after a full review of `battery-pricing-app`'s email+password auth system (`src/lib/auth/*`, `prisma/schema.prisma` — `User`, `PasswordSetupToken`, `PasswordResetRequest`, `LoginRateLimitBucket` models). Confirmed with the user before this plan: full security parity with the source app (scrypt hashing, signed sessions, DB rate-limiting, audit log), but **no roles** — this app's users ("Authors" becoming real accounts) are all equal, unlike source app's `ADMIN`/`MANAGER`/`DIRECTOR`. `Experiment.author` (free-text `String?`) is explicitly **not** touched by this work — login is decoupled from experiment authorship.

  Schema (first card in the sequence — everything else in TECH-007/008/009 depends on this):
  ```prisma
  model User {
    id             String    @id @default(cuid())
    name           String
    email          String    @unique
    passwordHash   String?
    sessionVersion Int       @default(0)
    isActive       Boolean   @default(true)
    createdAt      DateTime  @default(now())
    updatedAt      DateTime  @updatedAt
    invitedBy      User?     @relation("Invites", fields: [invitedById], references: [id])
    invitedById    String?
    invitedUsers   User[]    @relation("Invites")
    issuedTokens   PasswordSetupToken[] @relation("IssuedBy")
  }

  model PasswordSetupToken {
    id             String    @id @default(cuid())
    tokenHash      String    @unique
    userId         String
    issuedByUserId String
    issuedBy       User      @relation("IssuedBy", fields: [issuedByUserId], references: [id])
    expiresAt      DateTime
    usedAt         DateTime?
    invalidatedAt  DateTime?
    createdAt      DateTime  @default(now())
  }

  model LoginRateLimitBucket {
    id            String    @id @default(cuid())
    scope         String    // "ip" | "email"
    scopeKey      String
    failuresAt    Json      // or DateTime[] — decide at implementation time, Postgres supports either
    cooldownUntil DateTime?
    @@unique([scope, scopeKey])
  }

  model AuditLog {
    id        String   @id @default(cuid())
    event     String   // LOGIN_SUCCESS | LOGIN_FAILURE | LOGOUT | INVITE_ISSUED | PASSWORD_SET
    userId    String?
    metadata  Json?
    createdAt DateTime @default(now())
  }
  ```
  No `PasswordResetRequest` table (source app had one, used purely as an audit trail for "forgot password" clicks) — folded into `AuditLog` instead of carrying a near-duplicate table, since this app's `AuditLog` already exists in this design and self-service password reset isn't in scope yet anyway (see TECH-009).

  Bootstrap: source app never self-invites its first account either — a one-time seed script (`prisma/seed.ts` or a manual one-off script) creates the first `User` row directly (no `invitedById`, `passwordHash` set from a fixed initial password or via the same scrypt helper from TECH-007), so that person can then use TECH-009's invite flow for the other two known Authors (Саша, Дима, Артём) once it ships.
- **Acceptance Criteria:**
  - `npx prisma db push` applies the four new models cleanly against the local dev DB (per `docs/PROJECT_CONTEXT.md` → Local Development, this project uses `db push`, not `migrate dev`).
  - A seed script creates exactly one `User` row with a working password when run against an empty `User` table, and is safe to re-run (no duplicate/second bootstrap user on a second run).
  - No `UserRole` enum or role field added anywhere in the schema.
  - `Experiment.author` and its existing free-text/select behavior are completely unchanged.
