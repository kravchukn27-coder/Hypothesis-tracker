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

None else open. See `docs/VERSIONS.md` for closed items.
