---
title: "FAQ"
description: "Common questions about Ogami's architecture, Zod 4 requirement, fonts, and deployment."
order: 6
---

### Why does Ogami require Zod 4 (`zod@^4`)?

`@/lib/ogami/define-template` and `@/lib/ogami/render` inspect Zod v4 schema metadata (`schema.def`, `.maxLength`, `z.core.$ZodIssue`) and `/playground` uses built-in `z.toJSONSchema(...)`. Apps pinned to Zod 3 (`zod@3.x`) will hit type and runtime errors until upgraded to `zod@^4`.

### Why is `export const runtime = "edge"` not used?

Phase 0 testing on Next.js `16.4.6` confirmed that the Edge runtime is deprecated and that enabling `cacheComponents: true` fails the build if a route exports `export const runtime = ...` (for both `"edge"` and `"nodejs"`). Using the default Node.js runtime without a `runtime` export also lets Ogami read `.ttf` fonts cleanly via `fs.readFile`.

### Why does `shadcn add` not create `components.json`?

Ogami registry items use `"type": "registry:item"` with explicit file targets (`components/ogami/...` and `lib/ogami/...`). Installing works in fresh Next.js projects (`--src-dir` and `--no-src-dir`) without running `shadcn init` and without touching `globals.css`.

### Does Ogami work with `--src-dir` and custom path aliases?

Yes for standard `--src-dir` (`src/`) and `--no-src-dir` projects where `tsconfig.json` maps `@/*` to `./src/*` or `./*`. If your project uses a different import alias instead of `@/`, update the `@/lib/ogami/...` and `@/components/ogami/...` imports in the copied files.

### Why are some numbers formatted `1,200` and others `1.2k`?

All built-in number formatting uses **`en-US` rules only**. [github-repo](/templates/github-repo) uses plain `en-US` digit grouping (`Intl.NumberFormat("en-US")`), whereas the milestone cards ([stars-milestone](/templates/stars-milestone), [npm-downloads-milestone](/templates/npm-downloads-milestone)) use `@/lib/ogami/format-number`, defaulting to floored `"compact"` notation (`1.9k`, `1.2M`, never rounding `999,999` up to `1000k`) with a `format="exact"` toggle.

### Why are emoji stripped or blocked?

When `next/og` sees an emoji, Satori issues network requests to `cdn.jsdelivr.net` for Twemoji SVGs. To keep card rendering deterministic and offline-safe, Ogami strips emoji by default (reporting them in `X-Ogami-Warnings`) or triggers the safe fallback card when `emoji=fallback` is passed.

### Has Vercel production font tracing been verified?

**No.** Local Next.js builds, cache headers, and fresh `create-next-app` installs (with and without the `5.70 MB` Japanese font pack) have been tested locally, **but serverless font tracing (`outputFileTracingIncludes`) and cold starts on a live Vercel deployment remain unverified**. Also note that Vercel's free Hobby tier is limited to personal, non-commercial use.
