# Backlog Workflow

Simplified single-agent version of the workflow used in the Battery
Pricing App. No Cursor/Codex role split here — Claude Code implements
directly.

## Core rule

All open tasks live in `docs/backlog/`. This directory is the
operational source of truth for active work. `docs/VERSIONS.md` and
this project's chat history are not the backlog.

## Where to create a new task

- Product features / new screens → `PRODUCT.md`
- UI / UX / layout issues → `UI.md`
- Technical / architecture / data-model / refactor → `TECH.md`
- Defects / regressions → `BUGS.md`

## Required fields for every task

- ID (e.g. `PROD-001`)
- Status
- Priority
- Summary
- Description
- Acceptance Criteria

## Statuses

Active: `TODO`, `IN PROGRESS`, `BLOCKED`, `REVIEW`
Closed: `DONE`, `CANCELLED`, `WONTDO` — move closed tasks out of the
active files into a short note in `docs/VERSIONS.md` when they ship;
don't leave closed tasks sitting in the backlog files.

## Lifecycle

1. New task → add to the correct file in `docs/backlog/`.
2. Work starts → update status on the same card, don't duplicate it.
3. Work completes → mark closed, note it in `docs/VERSIONS.md`, remove
   the card from the backlog file.

## Hard rules (mirrors Battery Pricing App's AGENTS.md, simplified)

- One task = one scope. Don't mix unrelated fixes into one change.
- Don't change the Prisma schema / data model outside of a task that
  explicitly calls for it — the data model is derived from the Excel
  analysis in `docs/PROJECT_CONTEXT.md` and changes there ripple into
  every screen.
- Don't mark a task DONE before it's actually verified working (dev
  server + manual check in browser for anything UI-facing).
- Commit only when the user asks.
