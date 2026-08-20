# Server Action Surface

TECH-050: a map of every mutating (and a few read-only) Server Action
across the app — what it does, what it touches, and what auth it
expects. No behavior documented here should be taken as normative;
this reflects the code as of 2026-08-20 and will drift if not kept in
sync with the files it describes.

See `docs/PROJECT_CONTEXT.md` → Auth & Logging → Authentication for
the general authorization rule (TECH-043): every mutating action in
`backlog/actions.ts`, `experiments/actions.ts`, and
`comments-actions.ts` calls `getCurrentUser()` — either via a local
`requireAuthenticatedUser()`/`requireExperimentActionUser()` wrapper
(redirects to `/login` if absent) or an explicit null-check (returns
an error state instead of redirecting, for actions whose caller
expects a value back rather than a navigation). `lib/auth/actions.ts`
and `lib/auth/invite-actions.ts` are the exceptions — they *are* the
authentication boundary, so they don't gate on an existing session the
same way (see their own rows below).

Since TECH-034, every action wraps its body in
`runWithOperationCorrelation` (backlog/comments/experiments files
only — not the two auth files) so every `logError`/`captureServerError`/
audit call made during one invocation shares a `correlationId`.

## `src/app/backlog/actions.ts`

| Action | Auth | Side effects |
|---|---|---|
| `createHypothesis(prevState, formData)` | redirect | Creates `Hypothesis`. Audit `HYPOTHESIS_CREATED`. `revalidatePath("/backlog")`. Redirects to `/backlog?saved=1&hypothesisId=...`. |
| `updateHypothesis(id, prevState, formData)` | redirect | Updates `Hypothesis`. Audit `HYPOTHESIS_UPDATED`. Calls `syncExperimentFunnelLevelsForHypothesis` (cross-entity: pushes the hypothesis's Funnel Level onto every sibling `Experiment`). `revalidatePath("/backlog")`, `/backlog/[id]`. Redirects to `/backlog/[id]?promptArchive=1&saved=1` if the status change should prompt archiving, else `/backlog?saved=1`. |
| `updateHypothesisStatus(id, status)` | redirect | Updates `Hypothesis.status`. Audit `HYPOTHESIS_STATUS_CHANGED`. `revalidatePath("/backlog")`, `/backlog/[id]`. |
| `takeHypothesisIntoWork(id)` | redirect | No-op unless status is `ACCEPTED`. Creates the hypothesis's first `Experiment` if none exists yet (cross-entity), syncing Funnel Level onto it. Sets `Hypothesis.status = IN_PROGRESS`. `revalidatePath("/backlog")`, `/calendar"`. Returns `{ href }` instead of redirecting itself (caller navigates). |
| `deleteHypothesis(id)` | redirect | Blocked (returns an error) while the hypothesis still has any experiments. Deletes `Hypothesis`. Audit `HYPOTHESIS_DELETED`. `revalidatePath("/backlog")`. Redirects to `/backlog`. |
| `archiveHypothesis(id)` / `unarchiveHypothesis(id)` | redirect | Sets `archived`/`archivedAt`. Audit `HYPOTHESIS_ARCHIVED`/`HYPOTHESIS_UNARCHIVED`. `revalidatePath("/backlog")`, `/backlog/[id]`. |
| `archiveHypotheses(ids)` (bulk) | redirect | `updateMany` archive — no per-row audit event. `revalidatePath("/backlog")`. |
| `deleteHypotheses(ids)` (bulk) | redirect | Deletes only hypotheses with zero experiments; skips the rest and reports the skip count instead of failing the whole batch. `revalidatePath("/backlog")` (only if anything was deletable). |

"redirect" auth = local `requireAuthenticatedUser()`, which calls
`redirect("/login")` if there's no session.

## `src/app/backlog/[id]/comments-actions.ts`

| Action | Auth | Side effects |
|---|---|---|
| `createHypothesisComment(hypothesisId, prevState, formData)` | error state | Creates `HypothesisComment`. `revalidatePath("/backlog")`, `/backlog/[hypothesisId]`. |
| `deleteHypothesisComment(commentId)` | error state + ownership | Only the comment's own author may delete it (checked explicitly, not just "any logged-in user"). Deletes `HypothesisComment`. `revalidatePath("/backlog")`, `/backlog/[hypothesisId]`. |

"error state" auth = explicit `getCurrentUser()` null-check that
returns `{ error }` instead of redirecting — these are called from
`useActionState`/inline handlers that render the error in place rather
than navigating away.

## `src/app/experiments/actions.ts`

Public import surface for experiment actions. Rows marked **†** are
thin re-exports whose real implementation lives in
`src/app/experiments/actions/crud.ts` (below) — kept here so existing
`import { x } from "./actions"` call sites across the app didn't need
to change when TECH-037 split this file up.

| Action | Auth | Side effects |
|---|---|---|
| `syncExperimentFunnelLevelsForHypothesis(hypothesisId)` | redirect | Sets every `Experiment` under the hypothesis to the hypothesis's current `funnelLevelId` (single-value "set", not additive). `revalidatePath("/backlog")` and `/experiments/[id]` for each affected experiment. Called both directly (client) and internally by `createExperiment`/`updateExperiment` here and `updateHypothesis`/`takeHypothesisIntoWork` in `backlog/actions.ts`. |
| `createExperiment(prevState, formData)` | redirect | Redirects straight to the existing experiment if the hypothesis already has one (PROD-034: at most one ever). Otherwise creates `Experiment`, syncs Funnel Level to the hypothesis + siblings, optionally creates the first `ExperimentWeekStage` and recomputes derived fields, syncs the hypothesis's status. Audit `EXPERIMENT_CREATED`. `revalidatePath("/backlog")`, `/backlog/[hypothesisId]`, `/calendar`. Redirects to `/experiments/[id]?saved=1`. |
| `updateExperiment(id, prevState, formData)` | redirect | Updates `Experiment` fields; date/stage fields are a no-op if the experiment is week-tracked ("locked" — see Core Data Rules in `PROJECT_CONTEXT.md`). Audit `EXPERIMENT_UPDATED`. Syncs Funnel Level to hypothesis + siblings, syncs hypothesis status. `revalidatePath("/experiments/[id]")`, `/calendar`. Redirects to `/experiments/[id]?promptArchive=1&saved=1` or `?saved=1`. |
| `updateExperimentStage(id, stage)` | redirect | If week-tracked, upserts the *current week's* `ExperimentWeekStage` and recomputes derived fields + clears a stale `calendarHiddenOnDone`; otherwise updates `Experiment.stage` directly. Syncs hypothesis status. Audit `EXPERIMENT_STAGE_CHANGED`. `revalidatePath("/experiments/[id]")`, `/calendar`. |
| `updateExperimentDates(id, startDate, endDate)` | redirect | No-op if week-tracked. Otherwise updates `Experiment.startDate`/`endDate`. `revalidatePath("/experiments/[id]")`. No audit event. |
| `updateExperimentRollout(id, rollout)` / `updateExperimentAuthor(id, author)` | redirect | Updates one scalar field. `revalidatePath("/calendar")`, `/experiments/[id]`. No audit event. |
| `reorderCalendarExperiments(orderedExperimentIds)` | error state | Recomputes `manualOrder` across *every* active experiment (BUG-018 merge — not just the passed subset). Audit `CALENDAR_EXPERIMENTS_REORDERED`. **No `revalidatePath` call** — the client calls `router.refresh()` itself; inconsistent with every other action here but not a bug (worth normalizing if this file gets touched again). |
| `setExperimentWeekStage(experimentId, weekStartISO, stage)` | redirect | Inside one `prisma.$transaction` (TECH-022): upserts the `ExperimentWeekStage`, recomputes derived fields, clears stale `calendarHiddenOnDone`, syncs hypothesis status (revalidation deferred). Audit `EXPERIMENT_WEEK_STAGE_CHANGED` (outside the transaction). `revalidatePath("/backlog")`, `/backlog/[hypothesisId]`, `/experiments/[id]`, `/calendar`. |
| `completeExperimentWeek(experimentId, weekStartISO)` | redirect | Marks one `ExperimentWeekStage.completed = true`. `revalidatePath("/experiments/[id]")`, `/calendar`. No audit event. |
| `deleteExperimentWeek(experimentId, weekStartISO)` | redirect | Deletes one week entry (leaves a gap, doesn't shift the rest). Recomputes derived fields, clears stale hidden flag, syncs hypothesis status. `revalidatePath("/experiments/[id]")`, `/calendar`. No audit event. |
| `hideExperimentFromCalendar(experimentId)` / `showExperimentOnCalendarWhenDone(experimentId)` | redirect | Sets `calendarHiddenOnDone` true/false. `revalidatePath("/calendar")`. No audit event. |
| `addNextExperimentWeek(experimentId)` | redirect | Appends the next `ExperimentWeekStage` after the last one (or the current week if none). Recomputes derived fields, syncs hypothesis status. `revalidatePath("/experiments/[id]")`, `/calendar`. No audit event. |
| `shiftExperimentWeeks(experimentId, blockStartISO, blockEndISO, deltaWeeks)` | redirect | Deletes and recreates one contiguous block's week entries shifted by `deltaWeeks` weeks; no-ops (returns `{ changed: false }`) on collision with another block. Recomputes derived fields, clears stale hidden flag, syncs hypothesis status. `revalidatePath("/experiments/[id]")`, `/calendar`. No audit event. |
| `resizeExperimentWeeks(experimentId, blockStartISO, blockEndISO, deltaWeeks)` | redirect | Extends or shrinks one block's trailing weeks. Same recompute/clear-flag/sync/revalidate side effects as `shiftExperimentWeeks`. No audit event. |
| `getProducts()` / `getSegments()` / `getAuthors()` | none | Read-only distinct-value lookups for filters/selects. No side effects. |
| `deleteExperiment(id)` **†** | redirect | See `deleteExperimentAction` below. |
| `archiveExperiment(id)` / `unarchiveExperiment(id)` **†** | redirect | See `archiveExperimentAction`/`unarchiveExperimentAction` below. |
| `archiveExperiments(ids)` / `deleteExperiments(ids)` **†** (bulk) | redirect | See `archiveExperimentsAction`/`deleteExperimentsAction` below. |

"redirect" auth here = `requireExperimentActionUser()` (from
`actions/shared.ts`), same `redirect("/login")` shape as backlog's
`requireAuthenticatedUser()`. "error state" = explicit null-check.

## `src/app/experiments/actions/crud.ts`

| Action | Auth | Side effects |
|---|---|---|
| `getProductsAction()` / `getSegmentsAction()` / `getAuthorsAction()` | none | Read-only. No side effects. |
| `deleteExperimentAction(id)` | redirect | Deletes `Experiment`. If its hypothesis now has zero experiments, resets `Hypothesis.status` to `NEW` (cross-entity). `revalidatePath("/backlog")`, `/backlog/[hypothesisId]`, `/calendar`. Redirects to `/calendar`. No audit event. |
| `archiveExperimentAction(id)` / `unarchiveExperimentAction(id)` | redirect | Sets `archived`/`archivedAt`. Audit `EXPERIMENT_ARCHIVED`/`EXPERIMENT_UNARCHIVED`. `revalidatePath("/experiments/[id]")`, `/calendar`. |
| `archiveExperimentsAction(ids)` (bulk) | redirect | `updateMany` archive — no per-row audit. `revalidatePath("/calendar")`. |
| `deleteExperimentsAction(ids)` (bulk) | redirect | Bulk delete; resets any now-empty hypotheses to `NEW`. `revalidatePath("/backlog")`, `/calendar`, and `/backlog/[hypothesisId]` for each affected hypothesis. No audit event. |

`src/app/experiments/actions/week-stages.ts` (`recomputeExperimentDerivedFields`,
`syncHypothesisStatusForExperiment`, `hasWeekStages`,
`clearHiddenFlagIfNoLongerDone`) and `actions/tags.ts`
(`resolveExperimentTagIds`) are internal helpers, not Server Actions
themselves (no `"use server"`, never called from client code directly)
— they're the shared cross-entity sync logic the table above refers to
by name.

## `src/lib/auth/actions.ts`

| Action | Auth | Side effects |
|---|---|---|
| `loginAsUser(formData)` | *is* the auth boundary | Rate-limit check first (audit `LOGIN_FAILURE` + redirect to `/login?error=ratelimit` if tripped). Verifies credentials (audit `LOGIN_FAILURE` + redirect to `/login?error=credentials` on mismatch). On success: clears rate-limit failures, signs a session token and sets the session cookie, audit `LOGIN_SUCCESS`, redirects to the `from` path (guarded against open-redirect via `safeReturnPath`). Uses `safeWriteAuditLog` throughout (TECH-033). |
| `logout()` | reads current user for the audit row only | Audit `LOGOUT` — via the unguarded `writeAuditLog`, not `safeWriteAuditLog` (unlike `loginAsUser`; TECH-033 only covered login). Clears the session cookie. Redirects to `/login`. |

Neither action here wraps in `runWithOperationCorrelation` — TECH-034
only covered `backlog`/`experiments`/`comments` actions.

## `src/lib/auth/invite-actions.ts`

| Action | Auth | Side effects |
|---|---|---|
| `createInvite(prevState, formData)` | error state | Creates a `PasswordSetupToken` (`issueInvite`). Returns `{ link }` for the caller to display/copy — no `revalidatePath` (the `/users` list re-fetches on its own page reload, not via this action). |
| `setPasswordFromInvite(prevState, formData)` | none — token is the credential | Validates password rules, then consumes the invite token and sets `User.passwordHash` (`consumeInvite`). No `revalidatePath`. |
