# Contributing to Ogami

## Add a template in 5 minutes

**Prerequisites:** Node.js `>=22` (Active LTS `26` in `.nvmrc`), `npm install`, and the default `npm` package manager (do not use `pnpm` or `yarn`).

Each template lives in its own folder under `registry/templates/<id>/`, plus two one-line registrations so the gallery and `/api/og` route pick it up cleanly.

### 1. Copy the boilerplate folder

Pick a unique kebab-case ID (for example `my-card`) and create `registry/templates/my-card/template.tsx` and `registry/templates/my-card/meta.json`.

#### `registry/templates/my-card/template.tsx`

```tsx
import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().max(140).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #38bdf8")
    .default("#38bdf8"),
});

export default defineTemplate({
  id: "my-card",
  name: "My Card",
  description: "Clean dark announcement card template.",
  params,
  sample: {
    title: "Shipping Code-First OG Previews",
    subtitle: "Validated parameters and deterministic rendering with next/og.",
    accentColor: "#38bdf8",
  },
  render: (p, ctx) => {
    const fittedTitle = ctx.autoFit(p.title, {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 64,
      minFontSize: 32,
      lineHeight: 1.15,
    });
    const fontFamily = Array.from(new Set(ctx.fonts.map((f) => f.name))).join(
      ", ",
    );

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily,
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            width: "100%",
            height: "100%",
            border: "1px solid #27272a",
            borderRadius: 20,
            padding: 52,
            backgroundColor: "#111113",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 84,
              height: 6,
              borderRadius: 999,
              backgroundColor: p.accentColor,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: fittedTitle.fontSize,
                fontWeight: 700,
                lineHeight: fittedTitle.lineHeight,
                color: "#fafafa",
                wordBreak: "break-word",
                overflow: "hidden",
              }}
            >
              {p.title}
            </div>

            {p.subtitle ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: "#a1a1aa",
                  overflow: "hidden",
                }}
              >
                {p.subtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 20,
              color: "#a1a1aa",
            }}
          >
            OGAMI
          </div>
        </div>
      </div>
    );
  },
});
```

#### `registry/templates/my-card/meta.json`

```json
{
  "id": "my-card",
  "name": "My Card",
  "description": "Clean dark announcement card template.",
  "author": "Your Name",
  "tags": ["minimal", "dark"],
  "version": "1.0.0",
  "colors": [
    {
      "label": "Title on card",
      "foreground": "#fafafa",
      "background": "#111113",
      "largeText": true
    },
    {
      "label": "Subtitle on card",
      "foreground": "#a1a1aa",
      "background": "#111113",
      "largeText": false
    },
    {
      "label": "Accent bar on card",
      "foreground": "#38bdf8",
      "background": "#111113",
      "largeText": true,
      "foregroundParam": "accentColor"
    }
  ]
}
```

> **Note on `meta.json` `colors`:** `colors` is **optional**. When present, `/playground` evaluates WCAG contrast **only for the declared color pairs** (`4.5:1` normal text, `3:1` when `largeText: true`). Omitting `colors` does not assert that contrast passes; the playground explicitly notes when no pairs are declared.

### 2. Sync index, generate preview, and rebuild the registry

No manual edits outside `registry/templates/my-card/` are needed:

1. Sync `registry/templates/index.ts` and `app/_lib/template-previews.ts`:
   ```bash
   npm run templates:sync
   ```
2. Generate `registry/templates/my-card/preview.png` (`1200x630`):
   ```bash
   npm run preview:build
   ```
3. Rebuild the generated shadcn registry payloads in `public/r/`:
   ```bash
   npm run registry:build
   ```

### 3. Run all checks locally

Run the exact checks enforced by CI (use `npm` only; do not use `pnpm` or `yarn`):

```bash
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
npm test
npm run registry:build
```

Include `registry/templates/index.ts`, `app/_lib/template-previews.ts`, and any updated `public/r/*.json` files in your PR. You can also inspect your new card live with `npm run dev` at `http://localhost:3000/playground?template=my-card`.

---

## Verified Rules & Guardrails

### Satori rendering rules

- **Flexbox only:** No CSS Grid. Every element with multiple children should set `display: "flex"`.
- **Inline `style` objects only inside templates:** Templates must not use Tailwind CSS classes (Tailwind is for `app/` only).
- **Fonts:** Use `Array.from(new Set(ctx.fonts.map((f) => f.name))).join(", ")`. System fonts are unavailable. Supported font weights in default `geist@1.9.2` are `400` and `700`.
- **Do not export `runtime`:** Never add `export const runtime = ...` in route segments; `cacheComponents: true` rejects it and Ogami runs on the default Node.js runtime.
- **No render-time network requests:** Do not fetch external assets during rendering; emojis are stripped by default so `next/og` does not fetch Twemoji from `cdn.jsdelivr.net`.
- **Overflow & text bounds:** Every `z.string()` parameter (including optional/default/nested fields) must have a finite positive `.max(n)` cap, titles should use `ctx.autoFit(...)`, and containers should guard against long unbroken words (`wordBreak: "break-word"`, `overflow: "hidden"`).
- **Numbers:** Use `nonNegativeSafeIntParam`, `numberFormatParam`, and `formatNumber` from `../../lib/format-number` for new numeric counters (all formatting is `en-US` only).

### Registry & architecture rules

- **Keep `registry/` self-contained:** Never import from `app/` or `site.config.ts` inside `registry/`. Use relative `../../lib/...` imports inside templates (`scripts/build-registry.ts` rewrites them to `@/lib/ogami/...`).
- **Original designs & asset licensing:** Only submit original designs. Do not use trademarked logos (GitHub Octocat, npm wordmark, etc.) or copy commercial products. Any fonts or assets must carry an open license (e.g., SIL OFL 1.1 or MIT). Do not commit multi-megabyte font files.
- **`sample` scripts:** `sample` payloads must use only base-supported scripts (`Latin` / `Cyrillic`).

### What CI checks on every PR

1. `npm run lint` (ESLint)
2. `npx next typegen` + `npx tsc --noEmit` (Next.js route/asset types + TypeScript strict mode; no `any` without an explanatory comment)
3. `npm run build` (`next build` with `cacheComponents` and `partialPrefetching` enabled)
4. `npm test` (renders every registered template from its `sample` and checks `1200x630` PNG output; fails if `registry/templates/index.ts`, `app/_lib/template-previews.ts`, or `public/r/` is stale; scans `registry/templates/` folders confirming `id === folder`, `meta.json`, valid `sample`, `.max(n)` string caps, and existing `1200x630` `preview.png` without requiring byte-identical PNG output across OSes)
5. `npm run templates:sync` + `npm run registry:build` + `git status --porcelain` check on generated files

> **Note:** CI verifies that every `preview.png` exists and is a valid `1200x630` PNG, not that the image visually matches changes to `template.tsx`. Reviewers visually check `preview.png` updates in PRs.

### Verification status

- **Linux CI (`ubuntu-latest`):** Verified green on GitHub Actions (`Node 26` and `Node 22` compatibility jobs).
- **Vercel font tracing in production:** Deploying `/api/og` with `outputFileTracingIncludes` to Vercel serverless remains unverified in production (see `docs/launch-checklist.md`).
