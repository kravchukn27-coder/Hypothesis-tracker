# UI Backlog

## UI-004 — Saving a hypothesis/experiment gives no visible confirmation

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Clicking "Сохранить" on a hypothesis or experiment edit
form redirects back to the *same* detail page with the *same* data —
nothing visibly changes, so the user can't tell whether the save
actually happened.

**Description:** Source: user direction 2026-08-06. Resolved 2026-08-06
(design research pass, GrowthBook/Statsig): use a **toast notification**
("Сохранено" / error text) shown after a successful (or failed) save,
staying on the same detail page — not a redirect to the list, and not
a sticky confirmation bar. This was chosen specifically because it's
the lightest-weight fix and doesn't conflict with `updateHypothesis`
sometimes redirecting to `/backlog/[id]?promptExperiment=1` to trigger
the "Перевести в эксперимент?" modal (BUG-001) — a redirect-to-list
approach would have broken that flow; a toast doesn't touch the
redirect target at all.

Needs a shared toast/notification system (new, doesn't exist yet in
this app) — likely a small client-side provider + a `useToast`-style
hook, triggered after `createHypothesis`/`updateHypothesis`/
`createExperiment`/`updateExperiment` succeed or return an error.

**Acceptance Criteria:**
- After saving a hypothesis or experiment (success or validation
  error), a toast notification appears confirming the outcome.
- No change to existing redirect targets — `ExperimentPromptGate` /
  BUG-001's modal flow keeps working exactly as today.

---

## UI-005 — Backlog list: make truncated Comment clearer and clickable

**Status:** TODO
**Priority:** LOW
**Summary:** In the Backlog table's Comment column, the current
truncation length is fine — keep it as is — but it should be clearer
to the user that there's more text beyond what's shown, and the
comment text should be clickable: clicking it opens the hypothesis's
detail card, where the full comment is visible.

**Description:** Source: user direction 2026-08-06. Currently the cell
is plain (non-interactive) truncated text
(`src/app/backlog/page.tsx`, the `<td>` rendering `h.comment`). Two
changes:
1. Improve the visual affordance that the text is cut off (the
   truncation itself stays the same length/width).
2. Make the comment text clickable, navigating to `/backlog/[id]`
   (same target as the row's Name link) so the user can read the full
   comment there.

**Acceptance Criteria:**
- Comment cell truncation width/length unchanged from today.
- Visually clearer that truncated text continues beyond what's shown.
- Clicking the comment text navigates to `/backlog/[id]`.

---

## UI-006 — Hypothesis detail card: "Создать эксперимент" button should say "Показать эксперимент" when one already exists

**Status:** TODO
**Priority:** MEDIUM
**Summary:** On `/backlog/[id]`, the experiment button always says
"Создать эксперимент" and always links to the create flow, regardless
of whether the hypothesis already has experiments. It should mirror
the conditional behavior already shipped on the Backlog *list*
(PROD-011): no experiments yet → "Создать эксперимент"; has
experiments → "Показать эксперимент", linking to
`/experiments?hypothesisId=...` (same highlight-all-matching-rows
behavior as the list's "→ Эксперимент" link).

**Description:** Source: user direction 2026-08-06. This is the same
branch PROD-011 already added to `src/app/backlog/page.tsx` — just
missing from the detail page
(`src/app/backlog/[id]/page.tsx`), which still unconditionally renders
the create-flow button. The detail page's Prisma query doesn't
currently select `_count.experiments`, needed to decide which label to
show.

**Acceptance Criteria:**
- `/backlog/[id]`: no experiments → button reads "Создать эксперимент",
  links to `/experiments/new?hypothesisId=...` (unchanged).
- Has experiments → button reads "Показать эксперимент", links to
  `/experiments?hypothesisId=...` (highlights matching rows there, per
  PROD-011).

---

## UI-007 — Experiment form: Автор as select+add, like Funnel Level

**Status:** TODO
**Priority:** MEDIUM
**Summary:** `Автор` on the Experiment create/edit form
(`ExperimentForm.tsx`) is currently a plain free-text input. It should
work like `Funnel Level` on the Backlog form (UI-001): a select of
existing author names, sorted alphabetically, plus an explicit "add
new" option — not retyping the same name every time. Also, wherever
Автор is *displayed* (Experiments list, detail page), show it as a
small colored circular avatar with initials next to the name, not
plain text — idea from Statsig's experiment timeline (design research,
2026-08-06).

**Description:** Source: user direction 2026-08-06. Unlike Funnel
Level, `Author` has no dedicated table — it's a free-text column on
`Experiment` (same shape as `Segment`, which already has a distinct-
values filter from PROD-008). "Persisted" here just means: an author
name typed once is already stored on that experiment row; this task
is about the *picking* UX (select existing + add new), not about
introducing a new `Author` table. Reuse the `FunnelLevelField`
select+add interaction pattern, sourcing options from the distinct
existing `Experiment.author` values (same data PROD-008's Автор filter
already computes), sorted alphabetically. The avatar is a small,
self-contained addition: derive initials from the name, derive a
consistent color per name (e.g. a hash of the string into a fixed
palette) so the same author always gets the same color.

**Acceptance Criteria:**
- Автор field on the experiment create/edit form is a select of
  existing author names (alphabetically sorted) plus an "add new"
  option that swaps in a text input — same interaction as Funnel Level
  on the Backlog form.
- No new database table — this is a UI/UX change to how the existing
  free-text `author` field is entered, not a data-model change.
- Wherever Автор is shown as read-only text today (Experiments list,
  `StageCell` row, experiment detail page), it's shown as a small
  circular initials avatar + name, with a consistent color per name.

---

## UI-010 — Breadcrumb navigation on detail pages

**Status:** TODO
**Priority:** LOW
**Summary:** Replace the plain "← Backlog" / "← Experiments" text link
on detail pages with a real breadcrumb (e.g. "Backlog / Название
гипотезы"). Source: design research on GrowthBook/Statsig docs UI,
2026-08-06.

**Description:** Small, self-contained polish item — gives more
context about where the user is than a bare back-link, and matches
the pattern used throughout GrowthBook's and Statsig's own docs/app
navigation.

**Acceptance Criteria:**
- `/backlog/[id]` and `/experiments/[id]` show a breadcrumb (list name
  / current item name) instead of a plain "← Back" link.
