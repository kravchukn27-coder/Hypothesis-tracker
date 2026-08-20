# Bugs

---

## BUG-066: Calendar author filter — no "filtered to empty" state, and "Сбросить фильтр" doesn't activate

- **Status:** TODO
- **Priority:** Medium
- **Summary:** Filtering the Calendar by an author with no current
  experiments shows the generic "Пока нет ни одного эксперимента /
  Добавить первый" empty state instead of a filtered-empty state with a
  way to clear the filter. Separately, applying the author filter alone
  (no week-stage filter) never enables "Сбросить фильтр" — it stays
  disabled/greyed out the way it does with no filters at all. Reported
  with screenshots 2026-08-20.
- **Description:** Two related gaps in `src/app/calendar/page.tsx`:
  1. **Wrong empty state.** `experiments` (line 106-111) already
     applies `authorsFilter` before `displayedExperiments` (line 120) is
     built from it. The empty-state branch (line 257:
     `displayedExperiments.length === 0 ? …`) can't distinguish "there
     are truly zero experiments in the system" from "the author filter
     matched zero" — both render the same dashed box with "Пока нет ни
     одного эксперимента." + an "Добавить первый" link to
     `/experiments/new`. When it's the filter's fault, that message is
     misleading (experiments exist, they're just filtered out) and gives
     no way to clear the filter, matching the "просто пустой экран"
     the user described.
  2. **"Сбросить фильтр" ignores the author filter.** Its enabled state
     is `hasWeekStageFilters` only (`weekStageFilters.size > 0`, line
     188/216) — `authorsFilter` isn't part of that check, so the button
     stays `aria-disabled` when only an author filter is active. Even if
     it were enabled, `resetWeekStageHref` (line 181,
     `calendarHref({ start: windowStart, clearWeekStage: true })`)
     wouldn't actually clear it either: `calendarHref` (line 155-172)
     always re-appends every `authorsFilter` value regardless of the
     `clearWeekStage` flag (line 168), so today it's a week-stage-only
     reset, not a full "clear all filters" reset — the button's label
     promises more than it does once an author filter is involved.
- **Acceptance Criteria:**
  - Selecting an author with zero matching experiments renders a
    filtered-empty state (distinct copy from the "no experiments at
    all" state) with a visible way to clear the filter, not the generic
    "Добавить первый" empty state.
  - "Сбросить фильтр" becomes active (not `aria-disabled`) whenever
    *either* a week-stage filter or an author filter is active — same
    activation rule the week-stage-only case already has today.
  - Clicking "Сбросить фильтр" while an author filter is active clears
    the author filter too, not just week-stage filters.
  - The true "zero experiments in the whole system" empty state (line
    257-266, `/experiments/new` "Добавить первый" link) still renders
    correctly when no filters are active and the calendar genuinely has
    nothing in it.
  - Verified in the browser: filter by an author with no current tasks
    (empty state + working reset), and confirm the existing week-stage
    filter behavior is unaffected.
- **Files:** `src/app/calendar/page.tsx:106-111` (`experiments`
  filtering), `:120` (`displayedExperiments`), `:155-172`
  (`calendarHref`), `:181` (`resetWeekStageHref`), `:188`
  (`hasWeekStageFilters`), `:212-222` ("Сбросить фильтр" button),
  `:257-266` (empty state branch).

---

## BUG-065: Backlog status never switches to "In progress" — must switch when the experiment is placed on the Calendar

- **Status:** DONE
- **Priority:** Medium
- **Summary:** Confirmed-correct flow today: `ACCEPTED` row → "Взять в
  работу" button → click creates an experiment that lands in the
  Experiments table **without a date**. What's wrong: right now the
  hypothesis's Backlog status **never** switches to `IN_PROGRESS` at
  all — the user needs it to switch specifically at the moment that
  experiment is actually placed on the Calendar (given a date/week).
  User corrected the framing 2026-08-20: this is not "switches too
  early," it currently doesn't switch at any point.
- **Description:** Reading the code as of 2026-08-20, the write *looks*
  like it should already happen — `takeHypothesisIntoWork`
  (`src/app/backlog/actions.ts:177-204`) sets `Hypothesis.status =
  "IN_PROGRESS"` directly at line 200 on button click, and
  `syncHypothesisStatusForExperiment`
  (`src/app/experiments/actions/week-stages.ts:34-53`) — also called
  from `createExperiment` (`src/app/experiments/actions.ts:195`) and
  from `setExperimentWeekStage` (`src/app/experiments/actions.ts:491`,
  which runs when an undated experiment is dragged from "Без дат" onto
  a Calendar week, per `docs/PROJECT_CONTEXT.md` Calendar section) —
  would also set it. That the user observes it never switching despite
  this means either a live repro will reveal a real defect (e.g. a
  `revalidatePath` gap leaving the Backlog list showing a stale value,
  an early return before line 200 is reached, or a status guard
  elsewhere reverting it), or the code has changed/behaves differently
  than this read suggests — needs a live repro before writing the fix,
  not a guess from source alone.
- **Acceptance Criteria:**
  - Reproduce in the browser first: click "Взять в работу" on an
    `ACCEPTED` row (status should stay `ACCEPTED`, experiment lands
    undated in Experiments), then place that experiment on the
    Calendar, and confirm what the Backlog list actually shows at each
    step today.
  - End state: the hypothesis's Backlog status shows `IN_PROGRESS`
    specifically once its experiment has been placed on the Calendar
    (given a date/week) — not before (an undated experiment must leave
    it at `ACCEPTED`), and not stuck at `ACCEPTED` after scheduling.
  - `setExperimentWeekStage` (the "placed on Calendar" trigger) is
    confirmed to be the source of truth for this transition, and
    whatever gap is causing today's no-op is fixed at its actual root
    cause, not papered over with an extra redundant write.
  - Existing DONE-transition behavior of `syncHypothesisStatusForExperiment`
    (all of a hypothesis's experiments Done → hypothesis `DONE`) is
    unchanged.
  - Verified in the browser: full flow from `ACCEPTED` → "Взять в
    работу" (status stays `ACCEPTED`, experiment appears undated) →
    schedule the experiment on `/calendar` (status becomes
    `IN_PROGRESS`).
- **Files:** `src/app/backlog/actions.ts:177-204`
  (`takeHypothesisIntoWork`), `src/app/experiments/actions/week-stages.ts:34-53`
  (`syncHypothesisStatusForExperiment`), `src/app/experiments/actions.ts:195`
  (`createExperiment`'s call into it).
- **Related:** UI-061 (status table ordering).

---

## BUG-064: Password-reset link origin trusts client-controlled Host header

- **Status:** DONE
- **Priority:** Medium
- **Summary:** `getRequestOrigin()` (`src/lib/auth/base-url.ts`) builds the
  absolute URL for `resetUserPassword`'s link (`src/app/users/actions.ts`,
  shown to the admin via `ResetPasswordButton.tsx`) from the
  `X-Forwarded-Host`/`Host` request headers, which are client-supplied
  unless a reverse proxy strictly overrides them. Found during a
  security audit (2026-08-20).
- **Description:** If the deployment's proxy doesn't pin the forwarded
  host, a request carrying a spoofed `X-Forwarded-Host` could make the
  generated reset link point at an attacker-controlled domain; an admin
  copying that link to a user would be handing out a token redeemable
  on a phishing site. `createInvite` (`src/lib/auth/invite-actions.ts`)
  avoids this today by returning a bare relative path — `getRequestOrigin`
  is only used for the password-reset link (BUG-061 intentionally
  introduced the header-based approach for invites too; see that card's
  notes on the alternative). Fix: build the origin from a configured
  `APP_BASE_URL`/`ORIGIN` env var instead of trusting request headers,
  or confirm and document that the hosting platform's proxy overwrites
  these headers before they reach the app (in which case downgrade/close
  this with that justification).
- **Acceptance Criteria:**
  - The link returned by `resetUserPassword` no longer derives its
    domain from client-controllable request headers, OR the deployment
    is confirmed (and documented) to strip/override
    `X-Forwarded-Host`/`Host` upstream, closing this as not applicable.
  - Verified: a request with a spoofed `X-Forwarded-Host` does not
    change the domain in the generated reset link.

---

## BUG-063: Calendar/backlog highlight-on-navigate never fades

- **Status:** DONE
- **Priority:** Medium
- **Summary:** Navigating to a task via a link that carries `experimentId`/
  `hypothesisId` (e.g. from the catalog to Calendar, or from Calendar to
  Backlog) scrolls to the row and highlights it (amber ring/background),
  but the highlight is driven purely by the query param being present —
  it never clears itself. It stays highlighted indefinitely (until the
  user manually navigates away and the param drops), instead of fading
  after a short, noticeable window.
- **Description:** The highlight is computed as `highlighted={e.id ===
  experimentId}` / `isHighlighted = h.id === hypothesisId` in
  `src/app/calendar/page.tsx` (`ExperimentWeekRow`/`UndatedRow`/
  `OutOfRangeRow` props), `src/app/calendar/AllExperimentsTable.tsx:346`,
  and `src/app/backlog/page.tsx:288` (paired with
  `src/components/ScrollToHighlighted.tsx` for the scroll). There's no
  timeout — the visual state is tied 1:1 to the URL param for the
  lifetime of the page view. Fix should auto-clear the highlighted
  state ~30-40 seconds after the scroll/highlight fires (e.g. a
  client-side timer that flips a local "still highlighted" flag off,
  independent of the URL param), so the row returns to its normal
  styling while the param itself can stay in the URL.
- **Acceptance Criteria:**
  - Navigating to Calendar (or Backlog) via a link with
    `experimentId`/`hypothesisId` still scrolls to and highlights the
    target row immediately, as today.
  - The highlight (ring/background) automatically clears roughly 30-40
    seconds after it first appears, without requiring navigation away
    from the page.
  - Verified in the browser: follow a highlight link, confirm the
    highlight is visible immediately, then confirm it's gone after
    waiting out the timeout without any further interaction.

## BUG-061: Invite/reset link is a relative path — breaks outside localhost

- **Status:** DONE
- **Priority:** High
- **Summary:** `createInvite` (`src/lib/auth/invite-actions.ts`) returns
  `link: \`/invite/${token}\`` — a relative path with no domain — which
  `InviteForm.tsx` shows in a read-only field for the admin to copy and
  send manually. Found while explaining the invite flow to the user
  (2026-08-20): this "works" locally only because whoever copies it
  already knows to prepend `http://localhost:3000`. Pasted as-is into
  Telegram/Slack/email, or opened once the app is deployed to a real
  domain, `/invite/xxxxx` is not a usable link.
- **Description:**
  Fix by building an absolute URL server-side instead of a bare path.
  Two options:
  - Derive it from the incoming request inside the Server Action via
    `headers()` from `next/headers` (`host` / `x-forwarded-host` +
    `x-forwarded-proto`, falling back to `https` in production). No
    per-environment config needed, but relies on the hosting platform
    setting forwarded headers correctly — verify once the actual
    hosting target is chosen.
  - Or an env var (e.g. `APP_BASE_URL`) set at deploy time and read via
    `process.env`. Simpler, but one more thing to keep in sync if the
    domain ever changes.
  Recommend the header-based approach as the default; fall back to the
  env var only if the hosting platform doesn't forward reliable host
  headers. Whichever is chosen, extract it into one small helper so
  PROD-062 (password reset links) can reuse the exact same logic
  instead of duplicating it.
- **Acceptance Criteria:**
  - The link shown in `InviteForm.tsx` (and any future reset-password
    link) is a full absolute URL (`https://<real-domain>/invite/<token>`),
    not a bare path.
  - Works unchanged in local dev (produces `http://localhost:3000/invite/...`)
    with no manual config step.
  - Verified by copying the generated link out of the app (e.g. into a
    new browser tab/incognito window) and confirming it navigates
    correctly without the user needing to know or guess the domain.

## BUG-016: Core backlog/experiment pages and mutations have no auth check

- **Status:** DONE
- **Priority:** Critical
- **Summary:** `/backlog`, `/calendar`, `/experiments/[id]`, `/backlog/new`,
  `/experiments/new` render with no session check, and nearly every
  Server Action in `src/app/backlog/actions.ts` and
  `src/app/experiments/actions.ts` (create/update/delete/archive/status
  mutations) never calls `getCurrentUser()`. Server Actions are POST
  endpoints callable directly regardless of which page rendered them —
  page-level `requireUserPage()` guards don't protect them. Found during
  a security audit (2026-08-20).
- **Description:** `requireUserPage()` is only applied on `/activity`,
  `/backlog/[id]`, and `/users`; there's no `middleware.ts` providing a
  blanket gate. Compare with `src/app/backlog/[id]/comments-actions.ts`,
  which correctly calls `getCurrentUser()` and rejects when absent — the
  same pattern needs to land in `backlog/actions.ts` and
  `experiments/actions.ts`, plus `requireUserPage()` needs to be added to
  the currently-unguarded pages.
- **Acceptance Criteria:**
  - Every mutating Server Action in `backlog/actions.ts` and
    `experiments/actions.ts` returns/redirects early when
    `getCurrentUser()` is null, before touching Prisma.
  - `/backlog`, `/backlog/new`, `/experiments/new`, `/experiments/[id]`,
    `/calendar` call `requireUserPage()` like the already-guarded pages.
  - Verified in the browser: an unauthenticated request (no session
    cookie) to any of the above pages/actions is rejected or redirected
    to `/login`.

---

## BUG-020: `resizeExperimentWeeks` never clears the stale calendar-hidden flag

- **Status:** DONE
- **Priority:** Medium
- **Summary:** Unlike `setExperimentWeekStage` and `deleteExperimentWeek`,
  `resizeExperimentWeeks` doesn't call `clearHiddenFlagIfNoLongerDone`
  after recomputing derived fields. Found during a code audit
  (2026-08-20).
- **Description:** Shrinking a week block (`deltaWeeks < 0`) can remove
  the trailing `DONE` week that made `calendarHiddenOnDone` get set to
  `true`. Every other path that can move an experiment off `DONE`
  (`setExperimentWeekStage`, `deleteExperimentWeek`) calls
  `clearHiddenFlagIfNoLongerDone` afterward so the flag doesn't outlive
  its condition (BUG-005 follow-up #3); `resizeExperimentWeeks` skips
  this, so an experiment resized off `DONE` stays permanently hidden
  from the Calendar. `shiftExperimentWeeks` has the same gap, though a
  same-length shift rarely changes which week is last/`DONE`.
- **Acceptance Criteria:**
  - `resizeExperimentWeeks` calls `clearHiddenFlagIfNoLongerDone` after
    `recomputeExperimentDerivedFields` when shrinking a block.
  - Verified in the browser: an experiment hidden via "Готово, убрать
    из календаря" reappears once resizing removes its `DONE` week.
- **Files:** `src/app/experiments/actions.ts:707-745`
  (`resizeExperimentWeeks`), `src/app/experiments/actions.ts:651-697`
  (`shiftExperimentWeeks`, same gap).
- **Resolution note:** Also fixed `shiftExperimentWeeks` (same gap,
  flagged in this card's description/Files) — same one-line insertion.
  Verified by code parity with the two working call sites, not a live
  browser pass (per user request to keep this proportional).
