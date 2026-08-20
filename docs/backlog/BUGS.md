# Bugs

---

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
