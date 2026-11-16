# Ogami: agent rules

Ogami is an open-source, code-first OG image toolkit for Next.js.
Before doing ANY work, read `docs/PROJECT_BRIEF.md` fully. It is the source of truth for intent, architecture, and phases.

## Workflow

- Work on ONE phase (or one small task) at a time. Never build ahead of the current phase.
- Stop at the end of each phase: summarize what changed, what to test, and what's next. Wait for my go-ahead.
- Before saying a task is done, run `npm run lint` and `npm run build` and report the results.
- Keep commits small, one concern each. Do not commit unless I ask.
- If something is ambiguous or the brief conflicts with reality, stop and ask with options and a recommendation.

## Rules

- Package manager is npm only. Do not use pnpm or yarn.
- TypeScript strict. No `any` without a comment explaining why.
- Verify APIs against current docs (Next.js, next/og / Satori, shadcn registry) before using them.
- Keep `registry/` self-contained: it must not import from `app/`.
- Never invent facts (platform sizes, library behavior, licenses). Look them up.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
