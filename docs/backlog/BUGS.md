# Bugs

---

## BUG-016: Core backlog/experiment pages and mutations have no auth check

- **Status:** TODO
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

## BUG-017: Login rate limiting is disabled

- **Status:** TODO
- **Priority:** Medium
- **Summary:** `LOGIN_RATE_LIMIT_ENABLED = false` in
  `src/lib/auth/login-rate-limit.ts` makes `loginAsUser` unthrottled —
  `isLoginRateLimited`/`recordLoginFailure` are no-ops. Found during a
  security audit (2026-08-20).
- **Description:** The rate-limit bucket implementation (IP + email
  scoped, cooldown-based) is fully built and only switched off by this
  flag, per the comment "Temporary switch: retain the rate-limit
  implementation, but do not block logins." Re-enabling it restores
  brute-force protection on `/login` without any other code change.
- **Acceptance Criteria:**
  - `LOGIN_RATE_LIMIT_ENABLED` is `true` (or the flag is removed and the
    limiter always runs).
  - Verified in the browser: repeated failed logins from the same
    IP/email trip the cooldown and return the `ratelimit` error.

---

---

## BUG-018: Calendar row reorder corrupts `manualOrder` across windows

- **Status:** TODO
- **Priority:** Critical
- **Summary:** `reorderCalendarExperiments` writes `manualOrder = 0..N-1`
  only across the experiments currently visible in the calendar's
  windowed/filtered view (`visibleRows`), but the global sort in
  `CalendarPage` applies `manualOrder` across *every* active experiment.
  Found during a code audit (2026-08-20).
- **Description:** Dragging rows in one 8-week window assigns
  `manualOrder` 0..N-1 to just that subset. Reordering a different
  subset later (a different week window, or a different `weekStage`/
  `calendarAuthor` filter) resets a *different* set of experiments to
  the same 0..N-1 range — duplicate `manualOrder` values now exist
  across unrelated experiments. `displayedExperiments.sort()` in
  `src/app/calendar/page.tsx:112-118` has no scoping to match, so the
  resulting global order interleaves the two reordered groups
  arbitrarily instead of reflecting either arrangement the user made.
- **Acceptance Criteria:**
  - Reordering rows in one calendar window/filter view does not corrupt
    the relative order of experiments outside that view.
  - Verified in the browser: reorder a few rows in one week window,
    navigate to a different window and reorder a different set, then
    return to the first window — its order is still what was set.
- **Files:** `src/app/calendar/page.tsx:112-118`,
  `src/app/experiments/actions.ts:465-493` (`reorderCalendarExperiments`).

---

## BUG-019: New experiments jump above manually-ordered calendar rows

- **Status:** TODO
- **Priority:** High
- **Summary:** In the calendar's row comparator, experiments with
  `manualOrder === null` sort *before* experiments with an explicit
  `manualOrder` — the opposite of the intended precedence. Found during
  a code audit (2026-08-20).
- **Description:** `src/app/calendar/page.tsx:113-114`:
  ```ts
  if (a.manualOrder === null && b.manualOrder !== null) return -1;
  if (a.manualOrder !== null && b.manualOrder === null) return 1;
  ```
  A brand-new experiment always starts with `manualOrder: null`, so
  under this comparator it jumps above every experiment the user has
  manually arranged (PROD-036) — defeating the "persist explicit row
  order" feature the first time a new experiment is created after any
  reorder.
- **Acceptance Criteria:**
  - Experiments with an explicit `manualOrder` sort before
    `manualOrder === null` experiments, not after.
  - Verified in the browser: manually reorder a few calendar rows,
    create a new experiment, confirm it does not appear above the
    manually-ordered rows.
- **Files:** `src/app/calendar/page.tsx:112-118`.

---

## BUG-020: `resizeExperimentWeeks` never clears the stale calendar-hidden flag

- **Status:** TODO
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

---

None else open. See `docs/VERSIONS.md` for closed items.
