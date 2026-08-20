# Bugs

---

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
