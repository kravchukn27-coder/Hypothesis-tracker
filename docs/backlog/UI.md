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

## UI-008 — Unify Backlog/Experiments table visual style

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Redesign the two list tables (`/backlog`, `/experiments`)
into one consistent, deliberately non-adaptive visual system instead
of each having its own organically-grown column widths. Source: user
direction + design research on GrowthBook/Statsig, 2026-08-06.

**Description:** Currently each table's columns use different
Tailwind `max-w-*`/`truncate` choices picked ad hoc per column, so the
two tables don't feel like the same product. Bundles four related
visual changes to the same surface (the two list pages), all sourced
from the Statsig/GrowthBook research pass:
1. Consistent, explicitly-set column widths shared between both
   tables (not shrinking/growing to content) — wide enough that the
   Comment column reads comfortably (current Backlog comment width is
   the right reference size, per the user).
2. Status shown as an icon + color (e.g. checkmark for a "settled"
   status, warning triangle for something needing attention) instead
   of only a colored text pill — faster to scan, seen on Statsig's
   experiment timeline.
3. A thin colored left-border accent on each row reflecting its
   status — replaces/unifies the current one-off amber
   background-highlight used for PROD-011's jump-to-experiment
   feature, so status-by-color becomes one consistent mechanism
   instead of two different ones.
4. Icon-based row actions (trash for delete, pencil for edit, plus for
   create) instead of text links ("Удалить", "Изменить",
   "→ Эксперимент") — needs a shared icon set, e.g. `lucide-react`
   (common with Tailwind projects, not yet a dependency here).

**Acceptance Criteria:**
- Backlog and Experiments tables share one column-width system —
  visually consistent row height/spacing between the two.
- Status column shows an icon + color, not just a colored text pill.
- Row status is also reflected via a colored left-border accent,
  replacing the current ad hoc amber-highlight-only approach.
- Row actions (delete/edit/create-related links) are icon-based, using
  one shared icon set across both tables.

---

## UI-009 — Redesign detail cards into sectioned layout with shared field components

**Status:** TODO
**Priority:** HIGH
**Summary:** Redesign `/backlog/[id]` (and the create form) and
`/experiments/[id]` (and its create form) from one flat vertical list
of fields into named, visually separated sections — plus a shared set
of Field/Input/Select components used by both forms instead of each
form hand-rolling its own. Source: user direction ("выглядит как
каша... неинформативно"), design research on GrowthBook/Statsig,
2026-08-06.

**Description:** GrowthBook's own detail pages (the "Overview" page
you land on after a minimal create) group fields into clearly labeled
sections rather than one long stack — same shape our
`HypothesisForm`/`ExperimentForm` should move to. Concretely:
- Group hypothesis fields into sections, e.g. "Основное" (Name,
  Hypothesis text, Funnel Level), "Оценка" (Impact, Effort, Reach,
  Confidence, Score), "Дополнительно" (Comment, Моделирование,
  Выборка, Task).
- Group experiment fields similarly, e.g. "Основное" (Name/hypothesis
  link, Status), "Таргетинг" (Автор, Segment, Таргетинг), "Расписание"
  (dates).
- Extract one shared set of form primitives (`Field`, text `Input`,
  `Select`) into `src/components/` and use them from both
  `HypothesisForm.tsx` and `ExperimentForm.tsx` instead of each
  defining its own — this is *why* the two forms currently look
  inconsistent with each other.
- Score keeps its distinct "stat card" treatment (large number, small
  label) it already has today — just restyled to match the new
  section system, not replaced with a chart/visualization (explicitly
  out of scope, per the user).

**Acceptance Criteria:**
- Hypothesis and Experiment detail/create forms are organized into
  clearly labeled sections instead of one flat field list.
- Both forms use the same shared Field/Input/Select components —
  consistent height, border-radius, spacing, and focus state across
  both.
- Score remains a plain large-number stat display (no chart/graph).

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

---

## UI-011 — Unified badge/tag design system

**Status:** TODO
**Priority:** MEDIUM
**Summary:** Make every "tag-like" element in the app — Funnel Level,
Hypothesis Status, Experiment Status/Stage — visually one consistent
system (shape, padding, font size, color logic), instead of each
having been styled independently as it was built. Source: design
research on GrowthBook/Statsig, 2026-08-06.

**Description:** This is a foundational/shared-component task —
likely produces a single `Badge` component other redesign tasks
(UI-008's status icon+color, UI-009's sectioned forms) end up
consuming, so it's worth doing as its own scoped piece rather than
inline inside those.

**Acceptance Criteria:**
- One shared badge/tag component used everywhere a status, stage, or
  funnel-level tag is rendered (list rows and detail pages, both
  Hypothesis and Experiment).
- Visually consistent shape/padding/typography across all of them;
  color-coding logic stays per-value as today (just unified in how
  it's applied).
