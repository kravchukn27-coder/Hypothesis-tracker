# Tech Backlog

## TECH-062 — Two more Server Actions still return a bespoke shape instead of `ActionResult`

- **Status:** TODO
- **Priority:** Low
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `takeHypothesisIntoWork` (`src/app/backlog/actions.ts`) returns its own one-off `{ href: string; error?: string }`, and `createHypothesisComment`/`deleteHypothesisComment` (`src/app/backlog/[id]/comments-actions.ts`) share a `CommentActionState` (`{ error?: string; success?: boolean }`) that isn't structurally the same as `HypothesisFormState`/`ExperimentFormState` (no `success` field) despite serving the identical `useActionState` role.
- **Description:**
  Found during an API design/consistency audit re-run (2026-08-20) — most of the return-shape inconsistency flagged in the original pass (TECH-046, closed) is now resolved via the shared `ActionResult<T>` type (`src/lib/action-result.ts`), adopted almost everywhere. These two spots are the remaining holdouts: `takeHypothesisIntoWork` needs a redirect target alongside its error, which `ActionResult<T>`'s `{ok:true} & T` shape already supports (`ActionResult<{href: string}>`); the comment actions' `CommentActionState` could likely just become `ActionResult` too, since nothing currently reads `success` as distinct from `ok`.
- **Acceptance Criteria:**
  - `takeHypothesisIntoWork` returns `ActionResult<{href: string}>` (or documents why a bespoke shape is still warranted here).
  - `createHypothesisComment`/`deleteHypothesisComment` return `ActionResult` instead of the separate `CommentActionState` type, with call sites (`CommentFeed.tsx` and friends) updated accordingly.
  - No behavior change to either flow.

## TECH-061 — Session guard (getCurrentUser + redirect to /login) copy-pasted across four files

- **Status:** TODO
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Chore
- **Summary:** The same three-line "require an authenticated user, else redirect to /login" guard is duplicated identically in `src/app/backlog/actions.ts`, `src/app/users/actions.ts`, `src/app/experiments/actions/shared.ts` (as `requireExperimentActionUser`), and `src/lib/auth/page-guards.ts` (as `requireUserPage`, for pages rather than actions).
- **Description:**
  Found during a tech-debt/architecture audit re-run (2026-08-20). This is the same class of duplication the codebase already fixed once for audit-log wrappers — consolidated behind `lib/audit-log.ts`'s `auditEvent(route)` factory (TECH-036) — but the session-guard case wasn't caught by that pass. A future change to the redirect target (e.g. adding a `?from=` param, matching what `src/proxy.ts` already does for middleware-level redirects) or to how "no session" is detected requires updating 3-4 near-identical copies, and it's easy to update some but miss others.
- **Acceptance Criteria:**
  - One shared `requireActionUser()` (or equivalent) lives in `src/lib/auth/`, used by `backlog/actions.ts`, `users/actions.ts`, and `experiments/actions/shared.ts` instead of each defining its own copy.
  - `requireUserPage()` either reuses the same underlying check or is left as-is with a comment noting it's the page-level counterpart — a deliberate decision either way, not an untouched fourth copy.
  - No behavior change to any existing redirect/guard.

## TECH-060 — experiments/actions.ts keeps a same-signature alias/pass-through facade over its own consolidated helpers

- **Status:** TODO
- **Priority:** Low
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `src/app/experiments/actions.ts` defines `requireAuthenticatedUser()`/`mutationFailure()` as pure renamed wrappers around `requireExperimentActionUser`/`experimentMutationFailure` (already exported from `./actions/shared`), and re-exports `getProducts`, `getSegments`, `getAuthors`, `deleteExperiment`, `archiveExperiment`, `unarchiveExperiment`, `archiveExperiments`, `deleteExperiments` as trivial one-line forwards to the `*Action` equivalents in `./actions/crud`.
- **Description:**
  Found during a tech-debt/architecture audit re-run (2026-08-20). The TECH-037 god-module split moved implementations out into `actions/{shared,tags,week-stages,crud}.ts`, but real call sites (`src/app/experiments/[id]/page.tsx:7-11`, `src/app/experiments/new/page.tsx:6-8`, `src/app/experiments/ArchiveExperimentModal.tsx:5`) still import the old un-suffixed names from `actions.ts` rather than the new `*Action` functions directly, so every one of these operations now has two live names to keep in sync. They've already started drifting: `deleteExperiment` returns the old `{error?: string}` shape while its sibling `*Action` functions return the newer `ActionResult`.
- **Acceptance Criteria:**
  - Call sites import the `*Action` functions directly from `./actions/crud` (or wherever they now live); the redundant re-exports and the `requireAuthenticatedUser`/`mutationFailure` aliases are removed from `experiments/actions.ts`.
  - `deleteExperiment`'s return shape is reconciled with the rest of the `*Action` family (or the discrepancy is deliberately documented) as part of the cleanup.
  - No behavior change to any experiment CRUD/archive operation.

## TECH-059 — logout() still uses unsafe writeAuditLog instead of safeWriteAuditLog

- **Status:** TODO
- **Priority:** Low
- **Area:** Observability
- **Type:** Fix
- **Summary:** `logout()` (`src/lib/auth/actions.ts:66`) calls the unsafe `writeAuditLog` for the `LOGOUT` event — the same class of issue already fixed for `LOGIN_SUCCESS`/`LOGIN_FAILURE` in this same file (TECH-033) was not applied here.
- **Description:**
  Found during an observability audit re-run (2026-08-20). A transient DB blip during logout throws unhandled instead of still clearing the session cookie and redirecting — a user trying to log out during a DB hiccup gets stuck with an unhandled error instead of a clean logout, and the failure itself isn't captured via `captureServerError` since `writeAuditLog` has no catch of its own.
- **Acceptance Criteria:**
  - `logout()`'s `writeAuditLog` call switches to `safeWriteAuditLog`, matching `loginAsUser` in the same file.
  - A simulated audit-log DB failure during logout no longer crashes the action — the cookie still clears and the redirect to `/login` still happens.
  - No change to `LOGOUT` event semantics on the healthy path.

## TECH-058 — reportRouteError buckets every boundary-caught error under one generic event/route

- **Status:** TODO
- **Priority:** Low
- **Area:** Observability
- **Type:** Chore
- **Summary:** `reportRouteError` (`src/app/error-actions.ts`) logs every error caught by any `error.tsx`/`global-error.tsx` boundary under the fixed event name `app.route_error.failed`, with `route` set to the boundary file itself rather than the action/module that actually failed — unlike every explicit try/catch site in the app, which uses a `<domain>.<action>.failed` event name and the real file as `route`.
- **Description:**
  Found during an observability audit re-run (2026-08-20). This degrades `ErrorEvent` signature dedup and Telegram alerting for anything that falls through to a boundary instead of being caught locally: two unrelated failures with similar error messages can end up bucketed together by message text alone, since the route component of the signature is always the same boundary file. Lower priority than the try/catch gaps this surfaces (see TECH-057) — this is a quality-of-signal issue, not a missing-coverage one, since the boundary itself does still call `captureServerError` today.
- **Acceptance Criteria:**
  - Where feasible, callers of the error boundary pass along a more specific origin (e.g. the failing action's name/route) so `reportRouteError` can forward a meaningful `route`/`event` instead of the boundary's own file — or, if not practically threadable from a client error boundary, this card is closed as "accepted as a last-resort bucket" with a one-line note in the description explaining why, rather than left open indefinitely.
  - No regression to the boundary's existing retry UI or its guarantee that every uncaught error still produces exactly one `ErrorEvent` row.

## TECH-057 — setPasswordFromInvite doesn't wrap consumeInvite in try/catch

- **Status:** DONE
- **Priority:** Medium
- **Area:** Observability / Auth
- **Type:** Fix
- **Summary:** `setPasswordFromInvite` (`src/lib/auth/invite-actions.ts:44`) calls `consumeInvite` (a `$transaction` with 4 writes) with no try/catch, unlike `createInvite` in the same file, which already does this correctly.
- **Description:**
  Found during an observability audit re-run (2026-08-20). A DB failure during password-set — covering both new-user onboarding and the newer PROD-062 password-reset-for-existing-users flow — currently falls through to the generic root `error.tsx` boundary (see TECH-058) instead of getting the domain-specific event name and route every other mutation in the app uses. This is the last server action still inconsistent with the try/catch + `captureServerError` pattern the rest of the codebase already follows on this security-critical path.
- **Acceptance Criteria:**
  - `setPasswordFromInvite`'s call to `consumeInvite` is wrapped in try/catch.
  - On failure, it calls `captureServerError` with a distinct event (e.g. `auth.invite.consume.failed`) and the real route, then returns the existing generic user-facing error state instead of throwing.
  - Existing success/error-state behavior (`used`/`expired`/`invalid` token cases, validation errors) is unchanged.

## TECH-056 — PasswordSetupToken.userId unindexed, filtered on every invite/reset issuance

- **Status:** TODO
- **Priority:** Medium
- **Area:** Data model
- **Type:** Fix
- **Summary:** `PasswordSetupToken.userId` (a required FK) has no index, but is filtered directly in `updateMany({ where: { userId, usedAt: null, invalidatedAt: null } })` — run on every invite issuance and every password reset issuance.
- **Description:**
  Found during a follow-up data/schema audit (2026-08-20), after TECH-026–031 closed. Postgres doesn't auto-index FK columns. The table only grows (old tokens are invalidated, never deleted) and both the invite flow and PROD-062's password-reset flow are active in production now, so this predicate runs on real, recurring traffic rather than a dormant path.
- **Acceptance Criteria:**
  - Add `@@index([userId])` (or `@@index([userId, usedAt, invalidatedAt])` if a composite better matches the actual filter).
  - `npx prisma db push` applied cleanly against the local dev DB.

## TECH-055 — Cover calendar.ts and login-rate-limit.ts with unit tests

- **Status:** TODO
- **Priority:** Medium
- **Area:** Testing
- **Type:** Chore
- **Summary:** `src/lib/calendar.ts` (week-bucketing, ISO week numbering, manual-order comparator — 243 lines, 10+ exported functions) and `src/lib/auth/login-rate-limit.ts` (login lockout/bucket-expiry logic) remain untested even though both were named explicitly in TECH-025's own description as priority areas — TECH-025 shipped the runner and covered `computeScore` plus the auth token/password boundary cases, but not these two.
- **Description:**
  Found during a follow-up test-coverage audit (2026-08-20), after TECH-025 closed. `calendar.ts` drives the calendar page's week grouping and row ordering — a regression in `compareByManualOrder`, `getISOWeekNumber`, or `startOfWeek` (e.g. on a DST boundary or year rollover) would silently misorder or misplace rows with no automated check. `login-rate-limit.ts` is the brute-force lockout boundary; a regression there could silently disable lockout or over-lock legitimate users. Scope is deliberately limited to these two files — the broader server-action layer (`experiments/actions.ts`, `backlog/actions.ts`) and `experiment.ts`'s derived-stage functions are separate, larger follow-ups.
- **Acceptance Criteria:**
  - `calendar.ts` has unit tests for `startOfWeek`, `getISOWeekNumber`, and `compareByManualOrder`, including at least one boundary case each (e.g. a date at a week/year edge, a tie in manual order).
  - `login-rate-limit.ts` has unit tests for: attempt count under the lockout threshold (allowed), at/over the threshold (locked out), and bucket expiry (lockout clears after the window).
  - `npm test` runs green locally.

## TECH-054 — getInvite: no try/catch around the public invite-token lookup

- **Status:** TODO
- **Priority:** Low
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `getInvite` (`src/lib/auth/invites.ts:85-95`), used by the public `/invite/[token]` page to validate a link before showing the set-password form, has no try/catch around its `prisma.passwordSetupToken.findUnique` call.
- **Description:**
  Found during a re-run of the backend resilience audit (2026-08-20), after verifying TECH-019–024's fixes. Lower severity than the rest of this batch since the app now has a root `error.tsx`/`global-error.tsx` (TECH-021) that catches the unhandled throw gracefully — but it's still an unauthenticated, public-facing route, so a DB blip currently shows the generic error boundary instead of a clean "link invalid, try again" state, and the failure isn't logged via `captureServerError` the way the rest of the invite flow (`issueInvite`, `issuePasswordReset`, `consumeInvite`) already is.
- **Acceptance Criteria:**
  - `getInvite`'s DB call is wrapped in try/catch, logs via `captureServerError`, and returns its existing `{ error: "invalid" }` shape (or a new distinct case, implementer's call) on failure rather than throwing.
  - `/invite/[token]` shows a clean message on a DB failure rather than the generic root error boundary.
  - No change to the token-validity logic (invalid/used/expired checks) for the DB-healthy path.

## TECH-053 — loginAsUser: no try/catch around the login flow's DB calls

- **Status:** DONE
- **Priority:** High
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `loginAsUser` (`src/lib/auth/actions.ts`) — the one path every unauthenticated visitor must go through — has zero try/catch around `isLoginRateLimited`, `prisma.user.findFirst`, `recordLoginFailure`, or `clearLoginFailures`, unlike every other server action in the codebase after the TECH-019–024/TECH-050 hardening pass.
- **Description:**
  Found during a re-run of the backend resilience audit (2026-08-20). This action appears to have been missed by the systematic try/catch + `captureServerError` pass that fixed every other mutation surface (`experiments/actions/*`, `backlog/actions.ts`, `comments-actions.ts`, `users/actions.ts`) — it doesn't even call `runWithOperationCorrelation` like its siblings do. The gap is more consequential than it was at the time of the original audit (TECH-019 era) because `LOGIN_RATE_LIMIT_ENABLED` is now `true` (`src/lib/auth/login-rate-limit.ts:5`, was `false` when first audited) — every login attempt now does 2+ extra unguarded `LoginRateLimitBucket` round-trips (`getBucket`/`saveBucket`) on top of the `User` lookup. A DB failure at any of these points throws unhandled: with TECH-021's root `error.tsx` in place it no longer crashes ugly, but nobody can log in during a DB blip and the failure is never sent through `captureServerError`/the Telegram alert pipeline the rest of the app already relies on to notice this class of problem.
- **Acceptance Criteria:**
  - `loginAsUser`'s body is wrapped in try/catch (or broken into a `try`-guarded core following the `mutationFailure` pattern used elsewhere).
  - On a DB failure, the user is redirected to `/login` with a clear, generic error (not the raw crash / generic error boundary) and the failure is logged via `captureServerError`.
  - Successful login, wrong-credentials, and rate-limited flows are all unchanged for the DB-healthy path.
  - `logout()` in the same file is in scope too if a quick pass finds it worth the same treatment, but it's lower risk (session-cookie clear only, one optional audit-log write) — implementer's call whether it needs its own try/catch or can stay as-is.

## TECH-052 — Clear npm audit advisories in build tooling (nanoid, deepmerge-ts)

- **Status:** DONE
- **Priority:** Low
- **Area:** Dependencies
- **Type:** Chore
- **Summary:** `npm audit` reports 4 high-severity advisories: `nanoid <3.3.18`
  (indefinite loop with a zero-size generator) via `postcss` (pulled in
  by Tailwind/Next's CSS build), and `deepmerge-ts <8.0.0` (stack
  exhaustion on recursive merges) via `@prisma/config` (Prisma's CLI
  config loader). Found during a security audit (2026-08-20).
- **Description:** Neither package sits on the running app's
  request-handling path — both are build/dev-time only (CSS processing,
  Prisma CLI) — so there's no confirmed runtime exploit path through the
  app itself. Still worth clearing for hygiene: `npm audit fix` covers
  `nanoid`; the `deepmerge-ts` chain needs a Prisma major-version bump
  (`npm audit fix --force` currently proposes downgrading to
  `prisma@6.12.0`, a breaking change — evaluate against the v7 upgrade
  path already in use before taking that).
- **Acceptance Criteria:**
  - `npm audit` (production and dev) reports no high/critical
    advisories for `nanoid` or `deepmerge-ts`, or their presence is
    explicitly justified and pinned with a documented reason.
  - `npm run build` and `prisma generate`/`migrate` still work after the
    version bump(s).
- **Resolution note (2026-08-20):** `npm audit fix` cleared `nanoid`
  (3.3.17 → 3.3.18+ via the `postcss` chain, no code/config change
  needed). `deepmerge-ts` stays pinned below 8.0.0 and unfixed:
  checked `@prisma/config`'s dependency across every currently
  published version on the v7 line, including prereleases
  (`7.10.0-dev.58`, the newest resolvable at audit time) — all of them
  pin `deepmerge-ts@7.1.5` exactly, so there is no forward upgrade on
  v7 that resolves it yet. The only advisory-clearing path today is
  `npm audit fix --force`'s proposed downgrade to `prisma@6.12.0`,
  which would revert this project's already-completed Prisma 7
  migration (driver adapters, `prisma.config.ts`) — a real regression,
  not a hygiene fix. Accepting the advisory as justified/pinned per
  this card's OR clause: `@prisma/config` (and its `deepmerge-ts` dep)
  is CLI/build-time tooling only, never imported by the running app
  (`src/lib/prisma.ts` uses `@prisma/client` + `@prisma/adapter-pg`
  directly), so there's no runtime request-handling exploit path.
  Revisit once upstream Prisma ships a v7/v8 release with
  `deepmerge-ts@8+`. `npm run build` and `npx prisma generate` both
  verified working after the `nanoid` bump.

## TECH-051 — Calendar drag-reorder rewrites manualOrder for every active experiment, not just the moved ones

- **Status:** DONE
- **Priority:** High
- **Area:** Performance
- **Type:** Fix
- **Summary:** `reorderCalendarExperiments` (`src/app/experiments/actions.ts`) fetches every active experiment, re-sorts them in JS, and then writes `manualOrder` for **all** of them inside a `$transaction` — one individual `UPDATE` per experiment — even when only a single row was dragged.
- **Description:**
  Found during a performance audit (2026-08-20), on the calendar drag-to-reorder feature built on top of `Experiment.manualOrder`. The action (`src/app/experiments/actions.ts:422-466`) does:
  1. `prisma.experiment.findMany({ where: { archived: false } })` — full active set, no limit.
  2. Sorts via `compareByManualOrder`, splices the dragged subset into its new position (`merged`).
  3. `prisma.$transaction(merged.map((e, manualOrder) => prisma.experiment.update({ where: { id: e.id }, data: { manualOrder } })))` — reassigns a sequential `manualOrder` to **every** row in `merged`, i.e. every active experiment, not just the ones whose position actually changed.

  Dragging one row with, say, 200 active experiments issues 200 individual `UPDATE ... WHERE id = ?` round-trips in one transaction, for a single-row move — and this runs on every drag interaction, scaling with total active-experiment count rather than with how many rows actually moved.
- **Acceptance Criteria:**
  - Only experiments whose `manualOrder` value actually changes are written — diff `merged` against each experiment's current `manualOrder` (from `allActive`) and update just that subset, not the full list.
  - Dragging a single row to a new position still produces the correct resulting order for every other active experiment (as read via `compareByManualOrder`) — this is a write-amplification fix, not a behavior change to the resulting order.
  - A drag that reorders a subset near the front/back of a large active-experiment set writes noticeably fewer rows than the total active count (verified by logging/counting `update` calls in dev, or via a quick manual check).
  - No change to `reorderCalendarExperiments`'s public signature, validation, or audit-log call.

## TECH-050 — No catalog of the Server Action surface or its side effects

- **Status:** DONE
- **Priority:** Low
- **Area:** Architecture
- **Type:** Chore
- **Summary:** There is no README or index describing what Server Action mutations exist across `backlog/actions.ts`, `experiments/actions.ts`, `backlog/[id]/comments-actions.ts`, `lib/auth/actions.ts`, and `lib/auth/invite-actions.ts` — including their `revalidatePath` side effects or auth expectations.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). `experiments/actions.ts` alone is ~850 lines with heavily interdependent derived-state syncing (`recomputeExperimentDerivedFields`, `syncHypothesisStatusForExperiment`, `applyFunnelLevelFromExperimentForm` call each other across several actions). Individual JSDoc comments are good, but there's no single place mapping "call this action → these are the side effects that fire," which slows onboarding given the coupling.
- **Acceptance Criteria:**
  - A short doc (or a table at the top of each actions file) lists action → purpose → side effects (revalidated paths, cross-entity syncs triggered).
  - No behavior change to any action.

## TECH-049 — Dead REST-style auth scaffolding (`unauthorized()`/`requireUser()`) never wired up

- **Status:** DONE
- **Priority:** Low
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `src/lib/auth/guards.ts` exports `unauthorized()` (`NextResponse.json({error}, {status:401})`) and `requireUser()`, but neither is imported anywhere in the app — there are no `app/api` route handlers for them to guard.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). This scaffolding implies an intended JSON-API error convention that was never built and isn't used by anything, which can mislead a future maintainer skimming the auth module for "how do I protect an endpoint."
- **Acceptance Criteria:**
  - Either delete `guards.ts`'s unused exports, or leave a one-line comment noting they're reserved for a future `app/api` route layer.
  - No behavior change to any current page or action.

## TECH-048 — No local existence/ownership check before mutating by id in several actions — relies on Prisma's uncaught throw

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Fix
- **Summary:** `updateExperimentRollout`, `updateExperimentAuthor`, `archiveHypothesis`, `unarchiveHypothesis`, `hideExperimentFromCalendar`, `showExperimentOnCalendarWhenDone`, and similar single-id field actions pass `id` straight into `prisma.*.update({ where: { id } })` with no existence check first.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). Compare to `deleteHypothesis` ([src/app/backlog/actions.ts](../../src/app/backlog/actions.ts)), which explicitly does `if (!hypothesis) return {}` before mutating. The unvalidated group instead lets Prisma throw `P2025` (record not found) uncaught on a bad/stale id, which surfaces as a Next.js error boundary instead of a handled "not found" result — inconsistent with the not-found handling already established elsewhere in the same files.
- **Acceptance Criteria:**
  - Each listed action checks the record exists (or catches `P2025`) and returns a handled result instead of throwing uncaught.
  - No behavior change for the valid-id path.

## TECH-047 — Silent no-op on invalid input in `updateHypothesisStatus` / `updateExperimentStage`

- **Status:** DONE
- **Priority:** High
- **Area:** Architecture
- **Type:** Fix
- **Summary:** `updateHypothesisStatus` ([src/app/backlog/actions.ts:140](../../src/app/backlog/actions.ts)) and `updateExperimentStage` ([src/app/experiments/actions.ts:391](../../src/app/experiments/actions.ts)) return with no value at all when `safeParse` fails on the incoming status/stage — the caller gets no signal that anything went wrong.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). This is inconsistent with `createHypothesis`/`updateHypothesis` (return `fieldErrors`) and `createExperiment`/`updateExperiment` (return a single `error` string) on the same kind of failure. A bad status/stage value — a stale client, a race, a manipulated request — currently fails completely silently: the UI has no way to detect or report it, so it just looks like the save didn't happen, which is hard to debug from a bug report.
- **Acceptance Criteria:**
  - Both actions return a result (even a simple boolean) the caller can use to show an error toast on invalid input.
  - No behavior change on valid input.

## TECH-046 — Server Action return-value contract has no shared shape

- **Status:** DONE
- **Priority:** High
- **Area:** Architecture
- **Type:** Chore
- **Summary:** Across `backlog/actions.ts` and `experiments/actions.ts`, mutations return wildly different shapes for success/failure: `void` via `redirect()`, `{error?: string}`, `{error?: string, fieldErrors?}`, `{error?: string, success?: boolean}`, `{becameDone: boolean}`, or nothing at all (success assumed unless Prisma throws).
- **Description:**
  Found during an API design/consistency audit (2026-08-20). No generic "call action, show error, show success" handler can be built against this surface — every caller has to know its specific action's contract. `setExperimentWeekStage` makes this worse: it returns `{becameDone: false}` both when the week correctly stayed not-done *and* when the input failed validation, so the two cases are indistinguishable to the caller.
- **Acceptance Criteria:**
  - A shared result type (e.g. `ActionResult<T>`) is defined and adopted for the fire-and-forget actions that currently return nothing.
  - `setExperimentWeekStage` distinguishes "input invalid" from "correctly stayed not-done" in its return value.
  - No behavior change to redirect-on-success actions (`createHypothesis`, `createExperiment`, etc.) — those keep their existing form-state contract.

## TECH-045 — Duplicate `getFunnelLevels()` defined in two files

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Fix
- **Summary:** `getFunnelLevels()` is defined identically in both `src/app/backlog/actions.ts:133` and `src/app/experiments/actions.ts:746`.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). Two copies of the same query is a drift risk — a future change (e.g. a filter, a field rename) is likely to be applied to only one copy, silently desyncing behavior between the backlog and experiment forms.
- **Acceptance Criteria:**
  - `getFunnelLevels()` lives in one shared module (e.g. `src/lib/funnelLevel.ts`, already imported by both files) and both call sites import it from there.
  - No behavior change.

## TECH-044 — Validation approach inconsistent across mutations (zod vs. none)

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `createHypothesis`/`updateHypothesis`/`createExperiment`/`updateExperiment`/`reorderCalendarExperiments` validate every field with zod; `updateExperimentRollout`, `updateExperimentAuthor`, `archiveHypothesis`, `deleteHypothesis`, `hideExperimentFromCalendar`, and others take raw strings/ids straight into Prisma calls with no schema.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). Related to TECH-048 (existence checks) but broader — there's no stated rule for when an action needs a zod schema versus when raw-typed params are acceptable, so it currently reads as inconsistent rather than a deliberate distinction (e.g. "form submissions get full schemas, single-field/id actions get lightweight inline checks").
- **Acceptance Criteria:**
  - Document (here or in `docs/PROJECT_CONTEXT.md`) the intended rule for when an action needs a zod schema vs. lightweight inline validation.
  - No code change required to close this card if the answer is "current split is intentional" — documenting the reasoning is sufficient, matching TECH-042's precedent.
- **Resolution note:** Confirmed the existing split is intentional, not
  accidental: the deciding factor is what kind of boundary the input
  crosses (untyped `FormData` / client-supplied array → full zod
  schema; constrained enum value → lightweight `safeParse`; single
  typed scalar from a typed caller → no schema, TS + Prisma +
  TECH-048's existence checks are the boundary), not field count.
  Documented in `docs/PROJECT_CONTEXT.md` → Auth & Logging →
  Authentication (Server Action validation rule). No code change.

## TECH-043 — Authorization checks present in only a few Server Actions, no stated rule for which need it

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `getCurrentUser()` is called explicitly inside only a handful of actions (`reorderCalendarExperiments`, `createHypothesisComment`/`deleteHypothesisComment`, invite/login actions) — every other destructive mutation (`deleteHypothesis`, `deleteExperiment`, `archiveExperiment`, the field-scoped `update*` actions) has no such check in the action itself, relying entirely on `src/proxy.ts` middleware having already gated the page.
- **Description:**
  Found during an API design/consistency audit (2026-08-20). Not a vulnerability today — `proxy.ts`'s matcher covers all non-`/api`, non-`/login`, non-`/invite` routes — but it means "does this action check auth" isn't answerable by reading the action's own code, and any future entry point that bypasses the normal page flow (a route handler, a script, a test) has no second line of defense. The asymmetry (why do only ~4 of ~35 actions check identity) currently reads as accidental rather than intentional.
- **Acceptance Criteria:**
  - Document the intended rule (e.g. "actions rely on proxy middleware for gatekeeping; `getCurrentUser()` is only called when the action needs the *identity*, not just permission — audit log attribution, comment ownership") in `docs/PROJECT_CONTEXT.md` or `docs/CANONICAL_RULES.md`.
  - No code change required to close this card if the current split matches that rule once stated.
- **Resolution note:** The premise changed since this audit — BUG-016
  (landed separately) made every mutating action call
  `getCurrentUser()`/`requireAuthenticatedUser()`, so the asymmetry
  this card flagged no longer exists. Documented the resulting rule
  (defense-in-depth per-action gating + audit identity, not just
  proxy-middleware gating) in `docs/PROJECT_CONTEXT.md` → Auth &
  Logging → Authentication. No code change needed.

## TECH-042 — typescript/@types/node/eslint pinned several majors behind latest

- **Status:** DONE
- **Priority:** Low
- **Area:** Dependencies
- **Type:** Chore
- **Summary:** `typescript` (`^5`), `@types/node` (`^20`), and `eslint` (`^9`) are range-pinned to majors well behind what's on the registry (`typescript` latest is 7.x, `@types/node` latest is 26.x, `eslint` latest is 10.x per `npm outdated`).
- **Description:**
  Found during a dependency audit (2026-08-20). The gap is likely intentional short-term (Next 16 / React 19's toolchain compatibility with these newer majors isn't confirmed), but with no tracked plan it will keep widening every time a new major ships, eventually forcing a large risky jump instead of incremental ones.
- **Acceptance Criteria:**
  - Decide and record (here or in `docs/VERSIONS.md`) whether these are deliberately capped and why, or schedule an upgrade pass.
  - No dependency version changes required to close this card if the decision is "stay capped for now" — documenting the reasoning is sufficient.
- **Resolution note:** Checked each package's actual constraint instead of
  leaving the "unconfirmed" guess:
  - `typescript` — genuinely blocked, not just unconfirmed.
    `typescript-eslint@8.67.0` (pulled in transitively by
    `eslint-config-next@16.3.0`) declares a peer range of
    `typescript: '>=4.8.4 <6.1.0'`; `typescript@7.x` violates that and
    would likely break type-aware linting. Stays capped at `^5` until
    `typescript-eslint` raises its ceiling — re-check next time
    `eslint-config-next` is bumped.
  - `eslint` — no found blocker for `9 → 10`.
    `typescript-eslint@8.56.0+` already supports `eslint: ^10.0.0`, and
    eslint 10's Node engine requirement
    (`^20.19.0 || ^22.13.0 || >=24`) is satisfied by the project's
    runtime. Left at `^9` for now since a version bump deserves its own
    verification pass, not a drive-by in a decide-and-record card — but
    it's schedulable whenever, not blocked.
  - `@types/node` — low-risk, types-only; no `engines.node` pinned in
    `package.json` to justify staying on a specific major. Fine to bump
    to `^26` opportunistically, not required.

## TECH-041 — pg / @types/pg declared as direct deps but never imported directly

- **Status:** DONE
- **Priority:** Low
- **Area:** Dependencies
- **Type:** Chore
- **Summary:** `pg` and `@types/pg` are intentionally direct dependencies: `src/lib/database-config.ts` imports `PoolConfig`, and `scripts/verify-db-timeout.ts` instantiates `Pool`.
- **Description:**
  Revalidated during TECH-041 (2026-08-20). The direct dependencies are required by application and verification code; npm resolves the same deduped versions for `@prisma/adapter-pg`, so there is no duplicate installed package or version drift.
- **Acceptance Criteria:**
  - Confirm whether `pg`/`@types/pg` are pinned deliberately (e.g. to control the connection-pool version independent of the adapter); if so, leave a comment explaining why.
  - Otherwise, remove both from `package.json` and confirm `npm install` + `npm run build` still succeed with `@prisma/adapter-pg` supplying its own `pg`.

## TECH-039 — Duplicated startOfWeek()/MS_PER_DAY instead of importing the canonical lib/calendar.ts versions

- **Status:** DONE
- **Priority:** High
- **Area:** Architecture
- **Type:** Fix
- **Summary:** `src/app/experiments/actions.ts:78-87` reimplements `startOfWeek()` and `MS_PER_DAY` from scratch instead of importing the canonical exported versions from `src/lib/calendar.ts` — which `src/lib/experiment.ts` already imports correctly.
- **Description:**
  Found during a tech-debt/architecture audit (2026-08-20). Week-stage math in `actions.ts` (per-week upserts, and the drag-to-move/resize collision checks in `shiftExperimentWeeks`/`resizeExperimentWeeks`) computes week boundaries from its own private copy instead of the one the Calendar grid itself renders from (`buildTimeline` in `lib/calendar.ts`). Any future fix to Monday-start convention or DST handling in one copy silently doesn't reach the other, and the two could drift without any type error surfacing it.
- **Acceptance Criteria:**
  - `src/app/experiments/actions.ts` imports `startOfWeek` and the week-length constant from `src/lib/calendar.ts` instead of defining its own copies.
  - No behavior change to any existing week-stage/calendar action.

## TECH-038 — "Find-or-create tag by name" solved two different ways for the same kind of entity

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `resolveFunnelLevelId` (`src/lib/funnelLevel.ts`) and `resolveTagIds` (`src/app/experiments/actions.ts:155-166`) both upsert-by-name into a taggable entity (`{where:{name}, update:{}, create:{name, isCustom:true}}`), but via two unrelated-looking implementations — one a dedicated named function, the other a generic delegate-based helper used for Product/Segment.
- **Description:**
  Found during a tech-debt/architecture audit (2026-08-20). A developer fixing a bug in the upsert-by-name behavior (e.g. a race condition on concurrent creates) or adding a fifth taggable category has no single place to look — they have to know which of the two implementations is relevant, and neither reuses the other despite doing identical work.
- **Acceptance Criteria:**
  - One shared helper implements the upsert-by-name shape; `resolveFunnelLevelId` and `resolveTagIds` (or their replacement) both call it, ideally consolidated into one module (e.g. `lib/tags.ts`).
  - No behavior change to Funnel Level, Product, or Segment tag resolution.
- **Resolution note:** `resolveCustomTagId` in `src/lib/tags.ts` now owns the
  shared upsert-by-name operation. Funnel Level, Product, and Segment retain
  their existing input normalization and all use that helper.

## TECH-037 — experiments/actions.ts is an 849-line god-module mixing five unrelated concerns

- **Status:** DONE
- **Priority:** Medium
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `src/app/experiments/actions.ts` mixes zod schema/validation, tag resolution, week-stage/calendar block math (drag/resize/collision), plain CRUD, and audit logging in one 849-line file with no internal module boundaries.
- **Description:**
  Found during a tech-debt/architecture audit (2026-08-20). The Calendar drag-to-move/resize block logic (`getBlockEntries`, `hasEntriesInRange`, `shiftExperimentWeeks`, `resizeExperimentWeeks`, lines 618-744) has a different mental model and different callers than the CRUD/archive functions at the bottom of the same file. No submodule grouping means every change requires scrolling past unrelated logic, and increases the chance of an unnoticed naming collision as the file keeps growing.
- **Acceptance Criteria:**
  - The file is split into cohesive modules reflecting its actual concerns (e.g. `experiments/actions/weekStages.ts`, `experiments/actions/tags.ts`, `experiments/actions/crud.ts`), re-exported so existing imports elsewhere in the app don't need to change.
  - No behavior change to any exported action.
- **Resolution note:** Internal modules now own shared Server Action handling,
  tag resolution, week-stage invariants, and CRUD/query operations. The
  original `actions.ts` remains the compatible async Server Action facade, so
  existing UI imports remain unchanged.

## TECH-036 — Near-identical audit-log wrapper functions copy-pasted per action file

- **Status:** DONE
- **Priority:** Low
- **Area:** Architecture
- **Type:** Chore
- **Summary:** `auditBacklogEvent` (`src/app/backlog/actions.ts:13-16`) and `auditExperimentEvent` (`src/app/experiments/actions.ts:12-15`) are near-identical wrappers around `safeWriteAuditLog`, differing only in a hardcoded route string — and even within `experiments/actions.ts`, `reorderCalendarExperiments` (line 485) bypasses the local wrapper and calls `safeWriteAuditLog` directly.
- **Description:**
  Found during a tech-debt/architecture audit (2026-08-20). Any change to how the acting user is resolved for audit entries (e.g. adding an impersonation check) currently requires updating N near-identical copies instead of one shared place, and the existing inconsistent use of the wrapper within one file shows the duplication is already causing drift.
- **Acceptance Criteria:**
  - `src/lib/audit-log.ts` exposes an `auditEvent(route)` factory (or equivalent) that returns a bound logger.
  - `backlog/actions.ts` and `experiments/actions.ts` (including `reorderCalendarExperiments`) use it consistently instead of ad hoc local wrappers.
  - No change to any existing `AuditLog` event name, metadata shape, or route string value.

## TECH-035 — PrismaClient has no `log` config for query/error/warn visibility

- **Status:** DONE
- **Priority:** Low
- **Area:** Observability
- **Type:** Chore
- **Summary:** `src/lib/prisma.ts` constructs `PrismaClient` with no `log` option — slow queries, query-level errors, and warnings at the ORM layer are invisible unless the failure happens to bubble up to a call site that already logs it (which, per TECH-020, most don't yet).
- **Description:**
  Found during an observability audit (2026-08-20). Once TECH-020 lands, most mutation failures will get a `captureServerError` call from the action layer, but there's still no visibility into slow queries specifically, or into failures inside read paths (`findMany`/`findUnique` calls scattered across pages) that don't go through a try/catch at all. Prisma's own `log: ['warn', 'error']` (optionally `'query'` gated behind an env flag for local debugging only) is the cheapest way to close that gap without touching every call site.
- **Acceptance Criteria:**
  - `PrismaClient` is constructed with `log: ['warn', 'error']` at minimum, piped through `logWarn`/`logError` from `src/lib/log.ts` for structured output instead of Prisma's default stderr text.
  - Query-level logging (`'query'`) is opt-in via an env var, not always-on, so production stays quiet by default.
  - No change to any existing query's behavior or return values.

## TECH-034 — Correlation ID helpers exist but are never called

- **Status:** DONE
- **Priority:** Low
- **Area:** Observability
- **Type:** Chore
- **Summary:** `createOperationCorrelationId`/`withOperationCorrelation` (`src/lib/log.ts`) are defined and exported but have zero call sites anywhere in `src/` — no request currently gets an actual correlation ID threaded through its logs.
- **Description:**
  Found during an observability audit (2026-08-20). When a single failing request produces multiple log lines (e.g. a mutation, its derived-field recompute, and its audit write), there's currently no shared ID to join them — diagnosing requires correlating by timestamp alone. This depends on TECH-020 landing first (that's what adds most of the `captureServerError` call sites this would thread through).
- **Acceptance Criteria:**
  - A correlation ID is generated once per server action invocation (or centralized in a shared wrapper) and passed via `withOperationCorrelation` into every `logError`/`captureServerError`/audit call made during that action.
  - Two log lines from the same failing request share the same `correlationId` value; log lines from different requests don't.
  - No change to existing log payload shape beyond the added `correlationId` field.

## TECH-033 — loginAsUser uses unsafe writeAuditLog instead of safeWriteAuditLog

- **Status:** DONE
- **Priority:** Medium
- **Area:** Observability
- **Type:** Fix
- **Summary:** `loginAsUser` (`src/lib/auth/actions.ts`) calls the unsafe `writeAuditLog` for `LOGIN_FAILURE`/`LOGIN_SUCCESS` instead of `safeWriteAuditLog` — if that DB insert throws (a transient blip), the whole login action throws unhandled instead of degrading gracefully, and `writeAuditLog` itself has no catch, so the failure isn't logged anywhere either.
- **Description:**
  Found during an observability audit (2026-08-20). `backlog/actions.ts` and `experiments/actions.ts` already use `safeWriteAuditLog` for their own audit writes — `auth/actions.ts` predates that convention and was missed.
- **Acceptance Criteria:**
  - `loginAsUser`'s `writeAuditLog` calls switch to `safeWriteAuditLog`.
  - A simulated audit-log DB failure during login no longer crashes the login attempt — the user still gets the normal success/failure redirect, and the audit-write failure itself produces one `ErrorEvent` row via `captureServerError`.
  - No change to `LOGIN_SUCCESS`/`LOGIN_FAILURE` event semantics or existing `AuditLog` rows on the healthy path.
- **Resolution note:** Every `loginAsUser` audit write now uses
  `safeWriteAuditLog` with the auth action route. Healthy audit rows retain
  their event names and metadata; a failed write is recorded as an
  `audit_log.write_failed` error without interrupting the login redirect.

## TECH-032 — Login brute-force protection disabled with no compensating alert

- **Status:** DONE
- **Priority:** High
- **Area:** Security / Observability
- **Type:** Fix
- **Summary:** `LOGIN_RATE_LIMIT_ENABLED = false` (`src/lib/auth/login-rate-limit.ts:6`) fully disables login rate limiting via a "temporary switch," and nothing else compensates — `LOGIN_FAILURE` events are written to `AuditLog` but nothing reads that table for spike-based alerting the way `error-events.ts` does for application errors.
- **Description:**
  Found during an observability audit (2026-08-20). With rate limiting off, an attacker can submit unlimited password guesses per IP/email with zero blocking, and unlike application errors (which get a Telegram alert at ≥10 occurrences in a 5-minute window via `recordErrorEvent`), repeated `LOGIN_FAILURE` audit rows currently trigger no alert at all — a credential-stuffing run produces zero monitoring signal.
- **Acceptance Criteria:**
  - Either re-enable `LOGIN_RATE_LIMIT_ENABLED`, or add spike detection over `AuditLog` `LOGIN_FAILURE` rows (same signature/rate-alert shape as `recordErrorEvent`) so repeated failures from one IP/email trigger a Telegram alert even while blocking stays off.
  - If re-enabling, confirm with the user first — the switch was deliberately flipped off, per its comment, so silently reverting that decision isn't appropriate; surface the choice instead of assuming it.
  - No change to normal login behavior for legitimate users on the happy path.

## TECH-031 — HypothesisComment: consolidate three single-column indexes into one composite

- **Status:** DONE
- **Priority:** Low
- **Area:** Data model
- **Type:** Fix
- **Summary:** `HypothesisComment` has `@@index([hypothesisId])`, `@@index([authorUserId])`, and `@@index([createdAt])` as three separate indexes, but the only real query against this table (`backlog/page.tsx` — latest comment per hypothesis) needs `hypothesisId` + `createdAt` together.
- **Description:**
  Found during a data/schema audit (2026-08-20). The backlog list's nested query is `where hypothesisId, orderBy createdAt desc, take 1` — a composite `@@index([hypothesisId, createdAt])` serves that directly; the current three-index setup costs extra write amplification (three B-tree updates per insert) without buying anything the composite wouldn't. `authorUserId` has no query using it as a filter anywhere in the codebase today.
- **Acceptance Criteria:**
  - `@@index([hypothesisId])` and `@@index([createdAt])` replaced with `@@index([hypothesisId, createdAt])`.
  - `@@index([authorUserId])` kept only if a concrete near-term use is identified; otherwise dropped.
  - `npx prisma db push` applied cleanly against the local dev DB.
- **Resolution note:** Replaced the three single-column indexes with
  `[hypothesisId, createdAt]`, matching the only comment read path. No current
  query filters by `authorUserId`, so its unused index was removed. Applied
  successfully with `prisma db push` to the local database.

## TECH-030 — User.invitedBy: nullable self-relation defaults to Restrict instead of SetNull

- **Status:** DONE
- **Priority:** Medium
- **Area:** Data model
- **Type:** Fix
- **Summary:** `User.invitedBy` (`invitedById`, nullable FK) has no explicit `onDelete`, so Prisma emits `NO ACTION` (Restrict-equivalent) at the DB level instead of `SetNull` — deleting a user who has invited others would fail with a raw FK-violation error rather than cleanly nulling the reference.
- **Description:**
  Found during a data/schema audit (2026-08-20). No "delete user" feature exists today (only `isActive` toggling), so this is dormant risk rather than an active bug — but the field being optional signals the intended behavior is "just clear the reference," and the failure mode if this surfaces later (an opaque constraint error, not a clean null-out) is worse than doing nothing.
- **Acceptance Criteria:**
  - `invitedBy` relation gets `onDelete: SetNull`.
  - `npx prisma db push` applied cleanly against the local dev DB.
  - No behavior change to any existing screen (nothing deletes users today).
- **Resolution note:** Declared `onDelete: SetNull` on the nullable `Invites`
  self-relation. The local database was already in sync, and no user-facing
  deletion workflow was changed.

## TECH-029 — ErrorEvent.lastUserId unindexed despite being filtered on the Activity page

- **Status:** DONE
- **Priority:** Medium
- **Area:** Data model
- **Type:** Fix
- **Summary:** `ErrorEvent` has indexes on `lastSeenAt` and `route`, but the Activity page filters by `lastUserId` (`where: { lastUserId: user }`), which has no index at all.
- **Description:**
  Found during a data/schema audit (2026-08-20). The one column this specific page filters on isn't indexed, so that predicate forces a scan while `orderBy lastSeenAt` at least gets index support from the existing index.
- **Acceptance Criteria:**
  - Add `@@index([lastUserId])`, or a composite `@@index([lastUserId, lastSeenAt])` covering both the filter and the sort used by the Activity page query.
  - `npx prisma db push` applied cleanly against the local dev DB.
- **Resolution note:** Added the composite `[lastUserId, lastSeenAt]` index to
  match Activity's optional user filter and descending time order. Applied
  successfully with `prisma db push` to the local database.

## TECH-028 — AuditLog has no indexes despite being filtered/sorted on every Activity page load

- **Status:** DONE
- **Priority:** Medium
- **Area:** Data model
- **Type:** Fix
- **Summary:** `AuditLog` has zero indexes, but the Activity page filters by `userId`, does substring search on `event`, and always runs `orderBy: createdAt desc, take: 100`.
- **Description:**
  Found during a data/schema audit (2026-08-20) — a duplicate of the same finding from an earlier performance audit the same day was merged into this card (was TECH-018) rather than tracked twice. This table is append-only and grows forever — every backlog/experiment action writes an audit row across dozens of call sites — and is never pruned. Sorting 100 rows out of an ever-growing unindexed table means a full scan + sort on every Activity page view, and it only gets worse over the project's life. `event` is filtered via `contains` (case-insensitive substring), which a plain btree index can't serve — leave that column as-is unless full-text search becomes a real need. This is a `prisma/schema.prisma` change, so it falls under this project's "don't change the schema outside a task that explicitly calls for it" rule — this card is that explicit call.
- **Acceptance Criteria:**
  - Add `@@index([createdAt])` at minimum; consider `@@index([userId, createdAt])` given `userId` is a common filter.
  - `npx prisma db push` applied cleanly against the local dev DB.
  - `/activity` still filters/sorts/paginates identically — no behavior change, only the query plan improves.
  - (Retention/pruning policy is a separate concern, not required for this card.)
- **Resolution note:** Added `createdAt` and `[userId, createdAt]` indexes to
  `AuditLog`. The latter matches the Activity page's optional user filter and
  descending time order; event substring search remains intentionally
  unindexed. Applied successfully with `prisma db push` to the local database.

## TECH-027 — Experiment: missing indexes on hypothesisId, archived, startDate

- **Status:** DONE
- **Priority:** High
- **Area:** Data model
- **Type:** Fix
- **Summary:** `Experiment.hypothesisId` (a required FK) has no index, and there's no index on `archived`/`startDate` either, despite both being the filter/sort keys for the Calendar's main query.
- **Description:**
  Found during a data/schema audit (2026-08-20). Postgres does not auto-index foreign key columns — Prisma only adds one if `@@index` is declared or the FK participates in a `@@unique`. `hypothesisId` is looked up directly in at least 6 places (`backlog/actions.ts`, `experiments/actions.ts`) via `findFirst`/`findMany`, and the Calendar page (`calendar/page.tsx:79-85`) — the app's other main screen — filters by `archived` and orders by `startDate` on every load. All of these currently force sequential scans.
- **Acceptance Criteria:**
  - Add `@@index([hypothesisId])`.
  - Add `@@index([archived])` or a composite `@@index([archived, startDate])` matching the Calendar page's actual predicate + sort.
  - `npx prisma db push` applied cleanly against the local dev DB.

## TECH-026 — Hypothesis: missing indexes on archived, funnelLevelId, status

- **Status:** DONE
- **Priority:** High
- **Area:** Data model
- **Type:** Fix
- **Summary:** `Hypothesis` has no index covering `archived`, `funnelLevelId`, or `status`, all three of which are combined in the backlog list's `WHERE` clause (and `FunnelLevel`'s `hypotheses: { some: { archived: false } }` filter uses the same columns from the other side).
- **Description:**
  Found during a data/schema audit (2026-08-20). Every backlog page load — the primary landing page of the app — does a full table scan of `Hypothesis` filtered by `archived` (and often `status`/`funnelLevelId`), queried at `backlog/page.tsx:59` and `backlog/page.tsx:88`. This degrades linearly as hypotheses accumulate, with nothing to index-scan against today.
- **Acceptance Criteria:**
  - Add `@@index([archived, status])`.
  - Add an index covering `funnelLevelId` (standalone or composite with `archived`, per real query shape).
  - `npx prisma db push` applied cleanly against the local dev DB.

## TECH-025 — Stand up a test runner and cover critical business logic with minimal unit tests

- **Status:** DONE
- **Priority:** Medium
- **Area:** Testing
- **Type:** Chore
- **Summary:** The project has no test framework at all — no Jest/Vitest/etc in `package.json`, no test config, no test files under `src/`, and no `npm test` script. The only test-like artifact is `scripts/verify-auth-core.ts`, a manual assertion script that isn't wired into any enforced check (no `npm test` alias, no CI).
- **Description:**
  Found during a test-coverage audit (2026-08-20). Highest-risk untested areas: `computeScore` in `src/lib/hypothesis.ts` (the canonical Score-derivation formula — see `docs/CANONICAL_RULES.md` on Score never being stored, always derived); the week-bucketing/rollout logic in `src/lib/calendar.ts`; the login-lockout and session-token boundary conditions in `src/lib/auth/login-rate-limit.ts` and `src/lib/auth/token.ts`; and the 849-line server-action layer in `src/app/experiments/actions.ts`, which has no integration coverage. Scope for this card is deliberately minimal — pick a runner and prove the pattern on the highest-risk logic, not full coverage across the app.
- **Acceptance Criteria:**
  - A test runner is added and wired to `npm test` (Vitest is the natural fit given Next.js/TS, but the choice is open).
  - `computeScore` has unit tests covering normal input, `effort = 0`, and at least one boundary/edge case (e.g. negative or fractional inputs).
  - The auth boundary cases currently only covered by `scripts/verify-auth-core.ts` (wrong password, tampered token, expired token, session-version mismatch) are ported into the new test suite.
  - `npm test` runs green locally; no claim about CI wiring is made unless CI config is added in the same change.

## TECH-024 — deleteHypotheses: wrap findMany+deleteMany in try/catch

- **Status:** DONE
- **Priority:** Low
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `deleteHypotheses` (`src/app/backlog/actions.ts`) runs a `findMany` filter pass then a `deleteMany`, with no try/catch around either call — a DB error between them throws unhandled instead of reporting a partial-result error like the function's own docstring implies it should.
- **Description:**
  Found during a resilience audit (2026-08-20), see TECH-019 through TECH-023 for the related findings. Low risk in practice (delete-only, no dependent side effects to roll back), but inconsistent with the "skip blocked ones, report the skip count instead of failing the batch" resilience `deleteHypotheses` already implements for the *business* case (hypotheses with linked experiments) — a DB failure gets none of that same care.
- **Acceptance Criteria:**
  - The `findMany`/`deleteMany` pair is wrapped in try/catch.
  - On a DB failure, the action returns an `{ error }` state consistent with the existing "blocked" error message shape, not an unhandled throw.
  - Existing partial-success behavior (delete what's deletable, report the blocked count) is unchanged.

## TECH-023 — No connection/statement timeout on the Prisma/pg adapter

- **Status:** DONE
- **Priority:** Medium
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `src/lib/prisma.ts` constructs `PrismaPg({ connectionString: process.env.DATABASE_URL })` with no explicit connection or statement timeout, and no retry/backoff exists anywhere in the codebase for transient connection errors.
- **Description:**
  Found during a resilience audit (2026-08-20). A degraded (slow but responsive) DB can hang requests indefinitely rather than failing fast, since nothing bounds how long a query waits — combined with TECH-020/021's missing error handling, a slow DB currently looks like a hung app rather than a clear, recoverable error. Retry/backoff is deliberately out of scope here — this app's usage pattern (small trusted team, human-driven mutations, low request volume) benefits more from fail-fast-with-a-clear-error than from automatic retry.
- **Acceptance Criteria:**
  - The pg pool passed to `PrismaPg` sets an explicit `connectionTimeoutMillis` (and a statement timeout if the driver/DB supports one cleanly).
  - A deliberately unreachable/blackholed DB connection fails within the configured timeout instead of hanging indefinitely.
  - No behavior change for the normal (DB healthy) path.
- **Resolution note:** Runtime and seed Prisma adapters share a 5-second pg
  connection and statement timeout. `npm run verify:db-timeout` probes an
  unreachable local PostgreSQL endpoint and asserts that it fails within the
  configured bound.

## TECH-022 — setExperimentWeekStage: wrap its 4-step write sequence in a transaction

- **Status:** DONE
- **Priority:** Medium
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `setExperimentWeekStage` (`src/app/experiments/actions.ts`) performs 4+ sequential, non-transactional writes (upsert week stage → recompute derived fields → clear hidden flag → sync hypothesis status) — a DB failure partway through leaves `Experiment.stage`/`startDate`/`endDate` inconsistent with its `ExperimentWeekStage` rows, with no rollback.
- **Description:**
  Found during a resilience audit (2026-08-20). `reorderCalendarExperiments` in the same file already does this correctly with `prisma.$transaction` (`src/app/experiments/actions.ts:482`) — this card brings `setExperimentWeekStage` in line with that existing pattern. Depends on TECH-020 for the try/catch wrapper being added at the same time (a transaction that still throws unhandled only fixes the atomicity half of the problem, not the crash).
- **Acceptance Criteria:**
  - The upsert → recompute → clear-hidden-flag → sync-hypothesis-status sequence runs inside `prisma.$transaction`.
  - A simulated failure at any step leaves the DB in its pre-call state (no partial update), verified by checking `Experiment.stage`/`startDate`/`endDate` and `ExperimentWeekStage` rows after a forced error.
  - Existing return value (`{ becameDone }`) and calendar/detail-page behavior on success are unchanged.
- **Resolution note:** The full week-stage write sequence now runs in one
  interactive transaction. A regression test forces the derived-state step to
  fail and verifies that no week-stage or cached stage change is committed;
  audit logging and revalidation remain post-commit only.

## TECH-021 — Root error.tsx / global-error.tsx for unhandled route failures

- **Status:** DONE
- **Priority:** High
- **Area:** Resilience
- **Type:** Fix
- **Summary:** Only `/calendar` (`src/app/calendar/error.tsx`) has a route-level error boundary — `/backlog`, `/experiments`, `/users`, `/activity`, and every other route fall through to Next.js's default error page on any unhandled failure, and that failure is never captured by TECH-013's logging/alerting pipeline.
- **Description:**
  Found during a resilience audit (2026-08-20). A DB failure on any unprotected route currently shows a generic/stack-leaking dev error or a bare 500 in prod, with no retry UI and no `captureServerError` call — so outages on those routes are both unhandled *and* unnoticed by the Telegram alerting TECH-013/014 already built. Add a root `src/app/error.tsx` mirroring the calendar one (retry button, no stack trace shown to the user) and a `global-error.tsx` for failures in the root layout itself, which a route-level `error.tsx` can't catch.

  **Amendment (observability audit, 2026-08-20):** `/calendar`'s *existing* `error.tsx` has the same underlying gap — it only does `console.error(error)` in the browser, never reporting back to the server-side pipeline. Since a client error boundary can't call server-only code like `captureServerError` directly, this needs a small server action (or API route) the boundary can call to log the error server-side. Fix it alongside the new boundaries so all of them share one reporting path, instead of leaving the original one as the odd one out.
- **Acceptance Criteria:**
  - `src/app/error.tsx` exists, reports the error to the server-side pipeline (via a server action wrapping `captureServerError`) on mount, and shows a generic retry UI matching the calendar error page's style.
  - `src/app/global-error.tsx` exists to catch root-layout-level failures.
  - `/calendar`'s existing `error.tsx` is updated to use the same server-reporting call as the new boundaries, not left calling only `console.error`.
  - A deliberately-thrown error on an unprotected route (e.g. `/users`) now shows the new boundary instead of Next's default error page, and produces one `ErrorEvent` row.
  - A deliberately-thrown error on `/calendar` also produces one `ErrorEvent` row now, matching the other routes.

## TECH-020 — Wrap Prisma calls in mutation server actions with try/catch + captureServerError

- **Status:** DONE
- **Priority:** High
- **Area:** Resilience
- **Type:** Chore
- **Summary:** Every mutating server action in `src/app/experiments/actions.ts` and `src/app/backlog/actions.ts` (create/update/archive/delete for both hypotheses and experiments, week-stage changes, reordering, etc.) and `src/app/backlog/[id]/comments-actions.ts` calls Prisma directly with no try/catch — compare to `createInvite` (`src/lib/auth/invite-actions.ts:15-27`), which already does this correctly.
- **Description:**
  Found during a resilience audit (2026-08-20). TECH-014 wired `captureServerError` into "existing server actions" but this class of action — the core hypothesis/experiment CRUD, the highest-traffic mutation surface in the app — was apparently missed or added after that pass; grepping for `captureServerError`/`logError` today turns up only `safeWriteAuditLog` and `createInvite`. A transient DB error during any of these currently throws raw: the user sees an unhandled crash instead of the `{ error: "..." }` state shape these actions already return for validation failures, and the failure never reaches the Telegram alerting pipeline built specifically to catch this.
- **Acceptance Criteria:**
  - Every exported mutation in `experiments/actions.ts`, `backlog/actions.ts`, and `backlog/[id]/comments-actions.ts` wraps its Prisma call(s) in try/catch.
  - On failure, each calls `captureServerError` with a distinct `event` name (matching the `<domain>.<action>.failed` convention from TECH-014) and returns a user-facing `{ error: "..." }` state instead of throwing, using the same message style already used for that action's validation errors.
  - Existing successful-path behavior, redirects, and `revalidatePath` calls are unchanged.
  - A deliberately-triggered DB failure on one of these actions produces exactly one `ErrorEvent` row and a clean user-facing error, not an unhandled crash.

## TECH-019 — getCurrentUser: catch DB errors instead of letting them propagate

- **Status:** DONE
- **Priority:** Critical
- **Area:** Resilience
- **Type:** Fix
- **Summary:** `getCurrentUser()` (`src/lib/auth/session.ts`) only wraps `getSessionSecret()` in try/catch — the `prisma.user.findFirst` call on line 20 is unguarded and throws unhandled on any DB failure.
- **Description:**
  Found during a resilience audit (2026-08-20). `getCurrentUser` runs on nearly every page and server action (root layout, `requireUserPage()`, `auditBacklogEvent`/`auditExperimentEvent`) — TECH-016 already identified it as the single most frequently executed query path in the app. A DB blip (dropped connection, brief pool exhaustion) currently turns into an unhandled exception on every request touching session state, i.e. the whole app goes down with the DB, with no "you're logged out, try again" fallback. This is the highest-severity finding from the audit precisely because of how central this function is.
- **Acceptance Criteria:**
  - The `prisma.user.findFirst` call is wrapped in try/catch.
  - On a DB failure, `getCurrentUser` returns `null` (safe default — treated as "no session") rather than throwing.
  - The failure is logged via `captureServerError` (or equivalent) rather than silently swallowed.
  - Existing session-revocation behavior (mismatched `sessionVersion`, expired/tampered token, inactive user) is unchanged for the DB-healthy path.

## TECH-017 — Backlog/AllExperimentsTable: selection context re-renders every row checkbox on any toggle

- **Status:** DONE
- **Priority:** Medium
- **Area:** Performance
- **Type:** Fix
- **Summary:** `SelectionProvider` (`src/components/BulkSelection.tsx`) passes a freshly-constructed value object (and a new `Set`) to `SelectionContext` on every render; since every `RowCheckbox` in Backlog and AllExperimentsTable consumes the full context, toggling one checkbox re-renders every row's checkbox instead of just the one that changed.
- **Description:**
  Found during a performance audit (2026-08-20). Context updates bypass `memo` entirely — a new context value reference forces every consumer to re-render regardless of whether the specific data it reads changed. `selected` changes reference on every single toggle (`toggleRow`), so this is effectively O(rows) re-renders per click on tables that currently fetch their full unpaginated dataset.

  Fix: keep the stable callbacks (`toggleActive`, `toggleRow`, `toggleAll`, `clear`) memoized with `useMemo`/`useCallback` so they don't force re-renders on their own, and move per-row `selected` membership out of the shared context value — e.g. a per-row selector hook (`useSyncExternalStore` reading a ref-backed `Set`, or splitting into a separate context keyed by row id) so only the toggled row's `RowCheckbox` actually re-renders.
- **Acceptance Criteria:**
  - Toggling one row's checkbox in Backlog or the "all experiments" table does not re-render other rows' `RowCheckbox`/`SelectAllCheckbox` components (verified via React DevTools profiler or an added render-count check).
  - Select-all, clear-on-cancel, and bulk archive/delete still work identically from a user's perspective.
  - No change to `SelectionProvider`'s public API (`useSelection`, `RowCheckbox`, `SelectAllCheckbox`, `SelectModeToggle`) beyond internals — existing call sites in Backlog and AllExperimentsTable need no changes.

## TECH-016 — Memoize getCurrentUser() per request

- **Status:** DONE
- **Priority:** High
- **Area:** Performance
- **Type:** Fix
- **Summary:** `getCurrentUser()` (`src/lib/auth/session.ts`) runs a JWT verify plus `prisma.user.findFirst` on every call, and it's called more than once per request — once from the root layout, again from `requireUserPage()` on pages that use it (`/activity`, `/backlog/[id]`, `/users`), and again from server actions that call `auditBacklogEvent`. Wrap it in React's `cache()` so repeated calls within one request dedupe to a single query.
- **Description:**
  Found during a performance audit (2026-08-20). `src/app/layout.tsx` calls `getCurrentUser()` to render the header, and `requireUserPage()` (`src/lib/auth/page-guards.ts`) calls it again inside the page itself — React doesn't dedupe plain async function calls the way it dedupes `fetch`, so this is a full duplicate DB round-trip on every affected page load, and it's the single most frequently executed query path in the app (it runs on essentially every request).
- **Acceptance Criteria:**
  - `getCurrentUser` is wrapped in `cache()` from `"react"` in `src/lib/auth/session.ts`.
  - Within a single request, calling `getCurrentUser()` from both the layout and a page (or a server action) results in exactly one `prisma.user.findFirst` call, not two.
  - Session-revocation behavior (mismatched `sessionVersion`, expired/tampered token, inactive user) is unchanged — the cached result still reflects a real per-request lookup, just deduped within that request, not across requests.
  - No change to `getCurrentUser`'s public signature or return type — all existing call sites keep working unmodified.

## TECH-015 — Extend AuditLog to general domain actions, plus a log viewer

- **Status:** DONE
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

- **Status:** DONE
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

- **Status:** DONE
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
