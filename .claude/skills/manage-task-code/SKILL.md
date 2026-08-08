---
name: manage-task-code
description: Direct task flow with plan, lean verification, and commit gate for Claude Code, tuned for the Hypothesis Tracker repo. Use for any implementation or coding task in this project — backlog intake, complexity classification, execution plan for complex tasks, proportional verification, self-audit before closure, explicit user approval before commit. Project-scoped override of anthropic-skills:manage-task-code.
---

# manage-task-code (Hypothesis Tracker)

## Read First

Before starting any task, read:
- `CLAUDE.md` — working rules for this repo.
- `docs/PROJECT_CONTEXT.md` — project map, data model, core data rules.
- `docs/backlog/WORKFLOW.md` — backlog lifecycle and status rules.
- The canonical backlog card for the task, if present (`docs/backlog/*.md`).

---

## Purpose

Same workflow gates as the generic task-management skill — intake, clarification, complexity classification, plan-before-code for complex tasks, self-audit, commit only on request, no push — but with **verification scaled to the task**, not maxed out by default. This skill exists because exhaustive per-path browser QA and ad-hoc DB debugging on a small app like this one burns time and tokens without adding confidence proportional to the risk (confirmed with the user, 2026-08-08, after PROD-018).

Keep work scoped to one task only.

---

## Task Intake

1. Identify the task ID.
2. Find the canonical backlog card in `docs/backlog/`.
3. Extract only scope and acceptance criteria.
4. Check whether the task touches a Core Data Rule in `docs/PROJECT_CONTEXT.md` (e.g. derived Score, the `stage`/`weekStages` cache, required `hypothesisId`).

If the task is missing, ambiguous, or lacks enough business context — ask the user and stop. Do not invent scope, acceptance criteria, or business behavior. If the backlog card itself flags an open decision ("needs a decision before implementing"), ask that question before planning.

---

## Clarification Gate

If business logic is unclear: ask concise questions, don't guess, don't edit files yet. Technical uncertainty alone is not a blocker.

---

## Complexity Check

**SIMPLE:** scope is clear and local, obvious starting file, low regression risk, no schema/cross-cutting change.

**COMPLEX:** unclear root cause or affected module, multiple files/modules, schema change, or meaningful risk of breaking existing behavior (e.g. anything touching the `Experiment.stage`/`weekStages` derived-cache machinery, the Hypothesis↔Experiment linkage, or Score computation).

If unsure, classify as COMPLEX. For COMPLEX tasks, stop after a concise plan (Goal / Relevant files / Risks / Planned changes / Checks) and wait for approval before touching files.

---

## Direct Implementation

- Minimal task-scoped changes. No unrelated refactors or opportunistic cleanup.
- Reuse existing patterns before inventing new ones (this codebase leans hard on this — e.g. `ConfirmDeleteButton`, `SortableHeader`, `IconSelect`, the BUG-001 prompt-gate pattern). Check `docs/PROJECT_CONTEXT.md` and sibling files for the established shape before writing a new component.
- Inspect existing local changes (`git status`) before editing; don't disturb unrelated in-progress work.
- Don't change `prisma/schema.prisma` outside a task that explicitly calls for it. Schema sync in this repo is `npx prisma db push`, not `migrate dev` (see `docs/PROJECT_CONTEXT.md` → Local Development).

---

## Verification — proportional, not exhaustive

Run `npx tsc --noEmit` and `npx eslint src/` after implementation. Fix everything they catch.

Then verify in the browser **only what's genuinely at risk**, scaled by complexity:

- **SIMPLE / UI-only tweak:** one visual check — screenshot or `get_page_text` after the change. Skip the full interaction cycle if there's nothing stateful to click through.
- **COMPLEX / new interactive flow:** verify **one representative path end-to-end**, not the full matrix. If the same pattern is repeated across symmetric surfaces (e.g. a feature added to both `Hypothesis` and `Experiment`, or both an inline cell and a form), verify one live in the browser and confirm the other by re-reading the diff — if the code is structurally identical, a second live pass adds cost without adding real confidence. Call this out explicitly in the PASS summary ("verified X live, Y confirmed by code parity") rather than silently skipping it.
- **Escalate to full verification** only when: the paths aren't actually symmetric (different guards, different data shape), the task touches money/data-loss/auth-shaped logic, or something looks off during the one check you did run.

**Before suspecting an app bug, check the obvious first:** is the control actually enabled/reachable the way a real user would hit it? Automation tools (`form_input`, coordinate clicks) can bypass a `disabled` attribute or hit a stale element after a re-render — that's a test artifact, not a bug. Reach for a direct DB check or a debugging script only after ruling out the test setup itself, and only if the browser-level signal is genuinely ambiguous.

**Keep browser tool calls cheap:**
- Prefer `find` with a narrow query or `get_page_text` over repeated full `read_page` dumps on the same screen.
- If `read_page` returns empty, take a screenshot once to let the page settle before retrying — don't loop blind retries.
- Re-fetch refs after any action that could re-render the DOM (`router.refresh()`, navigation) instead of reusing stale ones — a misclick from a stale ref costs more (chasing a phantom bug) than the fresh read would have.

If you create disposable test data (a throwaway hypothesis/experiment) to reach an otherwise-inaccessible state, delete it and confirm row counts are back to baseline before wrapping up — don't leave the dev DB polluted.

The user can also just say "lean" / "быстро" / "не гоняй по всем путям" to explicitly confirm a single-path check is enough, or "проверь всё" to ask for the full matrix — default to proportional per the complexity classification above absent other signal.

---

## Self-Audit

Inspect the resulting diff against: requested scope, backlog acceptance criteria, `CLAUDE.md` hard rules (one task = one scope, no schema drift, don't mark DONE unverified, no unsolicited commit/push), unexpected side effects, checks run or explicitly skipped (and why, per the proportionality note above).

Stop only when: **PASS** (ready for review) or **blocked/FAIL** (clear reason, smallest safe next step).

---

## Backlog And Docs Update

Update only after self-audit PASS, and only the current task's card:
- Mark status per `docs/backlog/WORKFLOW.md`.
- On DONE: add a note to `docs/VERSIONS.md` and remove the card from its backlog file (this project's workflow closes cards out of the backlog files, unlike repos that just flip a status field — see `docs/backlog/WORKFLOW.md` → Lifecycle).
- Don't touch other backlog cards or `docs/PROJECT_CONTEXT.md` unless the task changed architecture/data model/screens.

---

## PASS Output

```
PASS

What changed:
<short summary>

Checks:
<typecheck/lint result>
<what was verified live vs. confirmed by code parity, and why that split was safe>

Docs:
<updated or not needed>

Commit:
not done

Ask:
commit or not
```

## FAIL Output

```
FAIL

Reason:
<short reason>

Status:
<what was checked or what blocked progress>

Next:
<smallest safe next step>
```

---

## Commit Step

Only when the user explicitly asks:

```bash
git add <task-relevant files only>
git commit -m "feat|fix|refactor|docs: <message>"
```

Stage only task-relevant files — this repo tends to have other in-progress uncommitted work sitting around; check `git status` and don't sweep it in. One conventional commit message. Do not push. Do not amend unless asked.

---

## Hard Stops

- Do not guess business logic.
- Do not start COMPLEX implementation before presenting a plan.
- Do not skip typecheck/lint, and do not skip verification entirely — "proportional" means scaled, not zero.
- Do not mark the task DONE before self-audit PASS.
- Do not update unrelated backlog tasks.
- Do not commit automatically. Do not push.
- Do not mix multiple task scopes in one workflow.
- Do not leave disposable test data in the dev DB after verification.
