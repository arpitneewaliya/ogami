# Production Verification & Launch Checklist

Run **Part 1** against a live Vercel preview deploy before sharing Ogami publicly, then complete **Part 3** before announcing launch.

> **Important PR Review Note:** CI verifies that every template's `preview.png` exists and is a valid `1200x630` PNG, **not** whether the rendered pixels match recent edits to `template.tsx` (pixel output is not compared byte-for-byte across OSes). **Reviewers must visually inspect changed `preview.png` files in pull requests.**

---

## 1. Real Production Unknowns (Verify on a Vercel Preview Deploy First)

These behaviors have been verified locally on Windows (`next build` + `next start`) and on GitHub Actions Linux runners (excluding the 3 skipped Japanese tests), **but have not yet been verified on a live Vercel deployment**:

### 1.1 Serverless Font Tracing (`outputFileTracingIncludes`)
1. Confirm `next.config.ts` matches current Next.js `16.4.6` documentation ([output.md](../node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md)):
   ```ts
   outputFileTracingIncludes: {
     "/api/og": ["./registry/fonts/*.ttf", "./registry/fonts/cjk/*.ttf"],
   },
   ```
   *(In installed user apps, the patterns are `./node_modules/geist/dist/fonts/geist-sans/*.ttf` and `./ogami/fonts/cjk/*.ttf`.)*
2. Optionally set `VERCEL_ANALYZE_BUILD_OUTPUT=1` in Vercel Preview env vars and redeploy to inspect the exact traced size of `/api/og` in build logs (per [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations)).
3. Confirm the traced function stays well below Vercel's **`250 MB`** uncompressed function bundle size limit ([vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations)) — **traced `.ttf` font files count toward this limit** (up to `5 GB` with Large functions Beta).
4. Fetch `https://<preview-url>/api/og?template=github-repo` and confirm HTTP `200`, `image/png`, `1200x630`, rendered cleanly with `Geist` (no missing-font error).

### 1.2 Japanese Opt-In Font Pack (With & Without Font Installed)
Because GitHub Actions skips the 3 conditional Japanese tests (`NotoSansJP-Regular.ttf` is gitignored), a Vercel preview deploy is the primary place this path is verified end-to-end in production:

1. **Without `NotoSansJP-Regular.ttf` deployed:**
   - Fetch `https://<preview-url>/api/og?template=minimal-tech&title=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF%E4%B8%96%E7%95%8C`.
   - Confirm: HTTP `200`, `content-type: image/png`, `cache-control: no-store`, `x-ogami-fallback: true`, `x-ogami-unsupported-scripts: japanese`, safe fallback card rendered (no crash, no tofu).
2. **With `NotoSansJP-Regular.ttf` present (`registry/fonts/cjk/NotoSansJP-Regular.ttf` traced in `next.config.ts`):**
   - Fetch the same Japanese URL.
   - Confirm: HTTP `200`, `content-type: image/png`, `x-ogami-fallback` header **absent**, Japanese Hiragana/Katakana/Kanji render cleanly.
3. **If the documented `fonts.gstatic.com` download URL ever returns HTTP 404:**
   - Expected verified binary: `NotoSansJP-Regular.ttf` (Noto Sans JP `v57`, Regular weight `400`, `5,703,580` bytes, SIL Open Font License 1.1).
   - Expected **SHA-256**: `e2b91134dbbfb131454ff6237c702a73d57ec042b7c2f2cffd404167b63ac318`.
   - Recovery procedure: download a static Regular `.ttf` from Google Fonts (`google/fonts` repository or CSS2 API / verified Fontsource mirror), verify its SHA-256 (or test glyph rendering and `parseTtfCmapCodepoints`), verify SIL OFL 1.1 licensing, and update the URL/checksum in `scripts/build-registry.ts` and `content/docs/fonts.md`.

### 1.3 Cache Headers on Repeated Requests
1. Request `https://<preview-url>/api/og?template=github-repo` twice:
   - Confirm response carries `Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400`.
   - Inspect CDN response headers (`x-vercel-cache`) on the second request to confirm edge cache `HIT` without invoking the serverless function again.
2. Confirm fallback & error responses are **not** cached:
   - Unsupported script (`?template=minimal-tech&title=%E0%A4%A8%E0%A4%AE%E0%A4%B8%E0%A5%8D%E0%A4%A4%E0%A5%87`) -> HTTP `200`, `Cache-Control: no-store`, `X-Ogami-Fallback: true`.
   - Invalid param (`?template=stars-milestone&stars=NaN`) -> HTTP `400`, `Cache-Control: no-store`.
   - Unknown template (`?template=missing`) -> HTTP `404`, `Cache-Control: no-store`.

### 1.4 Cold and Warm Response Times
Record live latencies on the deployed region (`curl -w "%{time_total}\n"` or browser Network panel):
- Cold `/api/og` Latin render (`Geist-Regular.ttf` + `Geist-Bold.ttf`, ~255 KB total)
- Warm `/api/og` Latin render
- Cold & warm `/api/og` Japanese render (if `NotoSansJP-Regular.ttf` is traced, ~5.70 MB)

### 1.5 HTTP Status of Unknown Template & Doc IDs
Check live responses for unlisted dynamic params:
```bash
curl -I "https://<preview-url>/templates/does-not-exist"
curl -I "https://<preview-url>/docs/does-not-exist"
```
- Locally (`next start` under `cacheComponents: true` + `partialPrefetching: true`), these serve Next's prerendered App Shell with **HTTP `200`**, streaming the 404 UI and `<meta name="robots" content="noindex" />`. Record what Vercel returns in production.

---

## 2. Performance, Caching & Vercel Hobby Plan Audit

### Route Rendering & Caching Summary (Code Audit)
| Route | Build Mode | Caching & Fetch Behavior |
| --- | --- | --- |
| `/` (Gallery) | `○` Static | Uses static `preview.png` imports via `next/image`; zero `/api/og` calls. |
| `/templates/[id]` (8 known IDs) | `○` Static | Prerendered static HTML; Zod table generated at build; zero `/api/og` calls. |
| `/docs` & `/docs/[slug]` (6 known slugs) | `○` Static | Markdown tokenized to JSX on build; zero `/api/og` calls. |
| `/playground` | `◐` Partial Prerender | Interactive Client Component calls `/api/og` only on user selection/edits. |
| `/api/og` | `ƒ` Dynamic | Returns `s-maxage=604800` on valid PNGs; `no-store` on fallbacks and `400`/`404` JSON. |

### Vercel Hobby Plan Limits (Verified Sources Only)
Every figure below was verified directly against official Vercel documentation on **2026-11-17**. Any figure not directly confirmed on the linked page is explicitly marked unverified.

- **Monthly Hobby Allowances** (source: [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)):
  - **Fast Data Transfer:** First `100 GB`
  - **Fast Origin Transfer:** First `10 GB`
  - **CDN Requests:** First `1,000,000`
  - **Active CPU:** `4 CPU-hrs`
  - **Provisioned Memory:** `360 GB-hrs`
  - **Function Invocations:** First `1,000,000`
  - **Image Transformations:** First `5,000` (`300,000` Image Cache Reads, `100,000` Image Cache Writes)
- **Vercel Function Limits** (source: [vercel.com/docs/functions/limitations](https://vercel.com/docs/functions/limitations)):
  - **Uncompressed bundle size:** `250 MB` standard (`500 MB` Python; `Large functions (Beta)` up to `5 GB`). **Traced `.ttf` font files via `outputFileTracingIncludes` count toward this limit.**
  - **Hobby memory / vCPU:** `2 GB / 1 vCPU` (default & maximum)
- **Max Function Duration & Commercial Terms:**
  - `300s (default)` appears in plan comparison output on [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby) — confirm exact Hobby timeout cap and current **non-commercial / personal-use terms** at **[vercel.com/pricing](https://vercel.com/pricing)** before enabling any commercial or sponsor features (`unverified` verbatim terms wording on `docs/plans/hobby`, check `vercel.com/pricing`).

---

## 3. Final Owner Launch Checklist

1. **Domain Decision & Registry Sync:**
   - Choose production domain -> update `DEFAULT_SITE_URL` in [site.config.ts](../site.config.ts).
   - Set `NEXT_PUBLIC_SITE_URL` in Vercel environment variables.
   - Run `npm run registry:build` so `homepage` in [public/r/registry.json](../public/r/registry.json) updates and matches.
2. **Package & Repo Availability:**
   - Confirm npm package name `ogami` (if reserving for a future CLI) and GitHub repository slug availability.
3. **Replace Every Placeholder:**
   - `https://ogami.example.com` placeholder URL:
     - [site.config.ts](../site.config.ts) (`DEFAULT_SITE_URL`, line 6)
     - [README.md](../README.md) (lines 12 & 15)
     - Regenerated [public/r/registry.json](../public/r/registry.json) (`npm run registry:build`)
     - *(Note: placeholder notices in `app/_components/install-command.tsx` and `app/docs/[slug]/page.tsx` automatically hide once `NEXT_PUBLIC_SITE_URL` is configured.)*
   - Demo GIF/video placeholder (follow [demo-script.md](./demo-script.md) to record):
     - [README.md](../README.md) (line 5)
     - [app/page.tsx](../app/page.tsx) (lines 60–85)
4. **Upload GitHub Repository Social Preview:**
   - File generated offline by Ogami: [docs/social-preview.png](./social-preview.png) (`1280×640` PNG, `51,997` bytes < 1 MB limit per [GitHub Docs](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)).
   - Upload on GitHub: Repo main page -> **Settings** -> **Social preview** -> **Edit** -> **Upload an image...** -> select `docs/social-preview.png`.
5. **Confirm CI Green on `main`:**
   - Verify both `Node 26` and `Node 22` jobs pass cleanly in GitHub Actions after final launch edits.
6. **Create Initial Open-Source Issues:**
   - Create the scoped issues listed from Phase 5, tagging **Korean (Hangul) font verification**, **Chinese (SC/TC) font verification**, and **`autoFit` OpenType `hmtx` glyph metrics** as **`help wanted`** research spikes rather than `good first issue`.
   - Good first issues: `github-repo` compact formatter alignment, `podcast-episode` template, `changelog` template, expanded sourced platform overlays in `platforms.ts`, and verified `opengraph-image.tsx` end-to-end example.
7. **Independent Contributor Walkthrough:**
   - Have someone other than the agent follow [CONTRIBUTING.md](../CONTRIBUTING.md) on a fresh fork/machine to verify onboarding end-to-end.
8. **Unknown-ID HTTP Status Check:**
   - Currently Next.js `16.4.6` bundled docs ([prefetch.md](../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/prefetch.md)) only configure client prefetch behavior (`'auto' | 'partial' | 'force-disabled'`), not unknown-param App Shell status codes under `cacheComponents` + `partialPrefetching`. Revisit HTTP `200` on unknown `/templates/<id>` and `/docs/<slug>` only if Next.js documents a supported per-route override.
