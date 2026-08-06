# Hypothesis Tracker — Working Rules

Read `docs/PROJECT_CONTEXT.md` first — it's the project map (stack,
screens, data model, origin-data mapping). Read the relevant canonical
backlog card in `docs/backlog/` before starting a task.

## Hard Rules

- One task = one scope. Don't mix unrelated fixes/features.
- Don't change `prisma/schema.prisma` outside a task that explicitly
  calls for a data-model change.
- `Hypothesis.Score` is never stored — always derived
  (`impact * confidence * reach / effort`) at read time. See
  `docs/PROJECT_CONTEXT.md` → Core Data Rules for why.
- Don't mark a backlog task DONE before verifying it in the browser
  (dev server) for anything UI-facing.
- Don't commit or push unless explicitly asked.

## Docs

- `docs/PROJECT_CONTEXT.md` — project map, update when architecture/
  data model/screens change.
- `docs/backlog/` — active tasks, split by area. See
  `docs/backlog/WORKFLOW.md` for the rules.
- `docs/VERSIONS.md` — change log, update when a task ships.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
