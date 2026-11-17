---
title: "Quick Start"
description: "Install an Ogami template into an existing Next.js project in under five minutes."
order: 1
---

Ogami templates install directly into your codebase using the shadcn registry format — you own the component files and runtime helpers with zero wrapper packages.

## 1. Install a template

Run the install command for any template (replacing `<template-id>` with one of the cards from the [gallery](/), or start with `github-repo`):

```bash
npx shadcn@latest add {{SITE_URL}}/r/github-repo.json
```

> **Note:** No `shadcn init` is required. Ogami registry items use explicit file targets (`registry:item`), so installing creates no `components.json` and leaves `globals.css` untouched.

Installed npm dependencies: `zod@^4.0.0` and `geist@^1.9.2`.

## 2. Check project requirements

- **Zod 4 (`zod@^4.0.0`) is required:** `@/lib/ogami/define-template` and `@/lib/ogami/render` inspect Zod v4 internals (`schema.def`, `.maxLength`, and `z.core.$ZodIssue`). If your project is pinned to **Zod 3** (`zod@3.x`), TypeScript checking and runtime schema validation will fail until you upgrade (`npm install zod@^4`).
- **`src/` directory layout:** If your app uses a `src/` directory (`--src-dir`), shadcn places files in `src/components/ogami/` and `src/lib/ogami/`. Without `src/`, files go to `components/ogami/` and `lib/ogami/`.
- **`@/*` tsconfig path alias assumed:** Installed templates import `@/lib/ogami/...` and the route snippet imports `@/components/ogami/...`, which relies on the default `create-next-app` alias (`"@/*": ["./*"]` or `"@/*": ["./src/*"]`). If your project uses a different alias, update those imports in the copied files.
- **Fonts are read from disk at render time:** Do not add `export const runtime = ...` to your image route. Next.js 16 deprecates the Edge runtime and fails the build if a route exports `runtime` when `cacheComponents: true` is enabled.

## 3. Add `/api/og/route.tsx`

Create `app/api/og/route.tsx` (or `src/app/api/og/route.tsx` in a `src/` project):

```tsx
import type { NextRequest } from "next/server";
import githubRepoTemplate from "@/components/ogami/github-repo";
import {
  extractTemplateParamsFromSearchParams,
  type RegisteredTemplate,
} from "@/lib/ogami/define-template";
import { TemplateValidationError, renderTemplate } from "@/lib/ogami/render";

const templates: Record<string, RegisteredTemplate> = {
  [githubRepoTemplate.id]: githubRepoTemplate,
};

export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const templateId =
    searchParams.get("template")?.trim() || githubRepoTemplate.id;
  const template = templates[templateId];

  if (!template) {
    return Response.json(
      {
        error: `Unknown template "${templateId}".`,
        availableTemplates: Object.keys(templates),
      },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  const rawParams = extractTemplateParamsFromSearchParams(
    searchParams,
    template,
  );
  const result = await renderTemplate(template, rawParams);

  if (!result.ok) {
    if (result.error instanceof TemplateValidationError) {
      return Response.json(
        { error: "Invalid template parameters.", issues: result.error.issues },
        { status: 400, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(
      { error: result.error.message },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  return result.response;
}
```

Test locally at `/api/og?template=github-repo` — it returns a `1200x630` PNG (`image/png`).

### Per-route alternative (`opengraph-image.tsx`)

If you prefer Next.js's built-in file convention for a fixed route instead of `/api/og`, you can call `renderTemplate(template, params)` directly from `opengraph-image.tsx` and return `result.response` (ensure the segment does not export `runtime` under `cacheComponents`).

## 4. Wire `generateMetadata`

Point a page's `openGraph.images` and `twitter.images` to `/api/og`:

```tsx
import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  const ogUrl =
    "/api/og?template=github-repo&name=acme%2Fogami&language=TypeScript&stars=1200";

  return {
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogUrl],
    },
  };
}
```

## 5. Number formatting note (`en-US` only)

All built-in number formatting is **`en-US` only**:

- [github-repo](/templates/github-repo) formats counts with plain `en-US` digit grouping (`Intl.NumberFormat("en-US")`, e.g., `1,200`).
- Milestone cards ([stars-milestone](/templates/stars-milestone) and [npm-downloads-milestone](/templates/npm-downloads-milestone)) use `@/lib/ogami/format-number`, defaulting to floored `"compact"` formatting (`1.9k`, `1.2M`) with a `format="exact"` (`en-US` grouped) option.

## 6. Deployment & font tracing note

Configure `outputFileTracingIncludes` in `next.config.ts` so serverless deployments trace the bundled `.ttf` binaries:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/og": [
      "./node_modules/geist/dist/fonts/geist-sans/*.ttf",
      "./ogami/fonts/cjk/*.ttf",
    ],
  },
};

export default nextConfig;
```

> **Unverified in production:** Local builds and `create-next-app` installs are tested, but **Vercel serverless font tracing, cold starts, and deployed function bundle sizes have not yet been verified on a live Vercel deployment.**

Next: read [Fonts](/docs/fonts) or [Supported Scripts](/docs/supported-scripts).
