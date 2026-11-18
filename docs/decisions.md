# Architecture & Engineering Decisions

Short log of key technical decisions made in Phases 0 and 1 (per `docs/PROJECT_BRIEF.md` Section 20).

---

## 2026-11-16 — Node.js default runtime without `export const runtime`

- **Decision:** Run `/api/og` on the default Node.js runtime and do **not** export `export const runtime` from any route segment.
- **Rationale:** Next.js `16.4.6` deprecates the Edge Runtime and fails `next build` when `cacheComponents: true` is enabled alongside any `export const runtime` (including `"nodejs"`). Phase 0 also showed Node.js had faster local cold/warm renders and supports direct `fs.readFile` font loading without HTTP self-fetching.

## 2026-11-16 — Option A script safety (Latin + Cyrillic + opt-in Japanese)

- **Decision:** Support Latin and Cyrillic (covered by bundled `Geist-Regular.ttf` and `Geist-Bold.ttf`) out of the box, plus Japanese (Hiragana, Katakana, JIS Kanji) via an opt-in, gitignored `NotoSansJP-Regular.ttf` pack. Treat Devanagari, Arabic, Hangul, Simplified Chinese outside `NotoSansJP`'s `cmap`, Greek (only 6 technical glyphs in Geist), Hebrew, Thai, and other complex scripts as unsupported in v1.
- **Rationale:** Phase 0 verified that `next/og` (Satori / `opentype.js`) renders broken Devanagari conjuncts/vowel reordering and throws HTTP 500 on Arabic (`lookupType: 5 - substFormat: 3 is not yet supported`). Checking real binary `cmap` tables guarantees no silent missing-glyph tofu boxes or hidden runtime Google Fonts fetches.

## 2026-11-16 — Option 1 safe fallback card for unsupported scripts

- **Decision:** When unsupported scripts are detected, return a safe fallback PNG (`HTTP 200`, `Cache-Control: no-store`, `X-Ogami-Fallback: true`, `X-Ogami-Unsupported-Scripts: <scripts>`) showing a sanitized `fallbackLabel` (defaulting to `template.name`) and containing zero characters of the user's unsupported text. Make `"return-error"` and `"throw"` available via `onUnsupportedScript`.
- **Rationale:** Social crawlers (X, LinkedIn, Slack, Discord) drop 4xx/5xx `og:image` responses and render broken previews. Returning `200 OK` with `no-store` keeps social shares intact without poisoning CDN caches and exposes typed errors and headers for tooling.

## 2026-11-16 — Emoji handling defaults to `"strip"` with `X-Ogami-Warnings`

- **Decision:** Default `renderTemplate` emoji mode to `"strip"` (removing emoji graphemes and VS16/keycap sequences before rendering, while preserving Geist-covered symbols like `©`, `®`, `™`, and `☺`), emit `warnings` plus an ASCII `X-Ogami-Warnings` header, and provide `emoji: "fallback"` as an option.
- **Rationale:** Inspection of `@vercel/og` `1.0.1` (`index.node.js`) confirmed `ImageResponse` unconditionally calls `fetch("https://cdn.jsdelivr.net/gh/twitter/twemoji...")` whenever an emoji grapheme is encountered, violating the zero-network render rule and failing offline. Stripping emojis by default keeps real titles readable instead of replacing the entire card with a generic fallback (differing intentionally from `docs/PROJECT_BRIEF.md` Section 10.2's blanket fallback wording, while keeping `"fallback"` configurable).

## 2026-11-16 — Bundled `Geist-Regular.ttf` + `Geist-Bold.ttf` and opt-in `NotoSansJP-Regular.ttf`

- **Decision:** Commit `Geist-Regular.ttf` (`125,956` bytes, weight `400`, `726` codepoints) and `Geist-Bold.ttf` (`72,960` bytes, weight `700`, `728` codepoints, fetched from `https://fonts.gstatic.com/s/geist/v5/gyBhhwUxId8gMGYQMKR3pzfaWI_Re-Q4nZPdy1U.ttf`), both under SIL Open Font License 1.1 (`198,916` bytes combined). Keep `NotoSansJP-Regular.ttf` (`5,703,580` bytes, SIL OFL 1.1) as an opt-in, gitignored pack loaded from disk and cached in module memory only when Japanese characters are present.
- **Rationale:** Keeps the default git repository and cold Latin/Cyrillic requests tiny (`<200 KB` total) while giving template headlines crisp bold hierarchy (`weight: 700`) and ensuring Latin-only requests never access `NotoSansJP-Regular.ttf`.

## 2026-11-16 — v1 `autoFit` heuristic

- **Decision:** Implement `autoFit` using script-aware `em` character-width weights, slash/hyphen word-break awareness, a line-packing factor, and `2px` step-down bounds rather than parsing OpenType `hmtx`/`kern` tables in v1.
- **Rationale:** Zero dependencies, sub-millisecond runtime, and sufficient accuracy for length-capped titles alongside `overflow: "hidden"` and `wordBreak: "break-word"` layout guards. Real font-metric measurement can replace it behind the same `ctx.autoFit` contract in a future version.

## 2026-11-16 — `Cache-Control` values and `X-Ogami-Warnings` format

- **Decision:** Set `Cache-Control: public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400` on successful renders, `Cache-Control: no-store` on fallback cards and 400/404 responses, and ASCII `U+XXXX` codepoint summaries in `X-Ogami-Warnings` (e.g. `title: stripped 1 emoji (U+1F680)`).
- **Rationale:** 7-day CDN caching with 1-day browser TTL and background revalidation protects Vercel Hobby compute during traffic spikes without locking URLs to 1-year `immutable` caching. Encoding stripped emojis as `U+XXXX` prevents Web Fetch `Headers` `ByteString` errors on codepoints `> 255`.

## 2026-11-16 — Narrow `outputFileTracingIncludes` for Vercel serverless builds

- **Decision:** Configure `outputFileTracingIncludes: { "/api/og": ["./registry/fonts/*.ttf", "./registry/fonts/cjk/*.ttf"] }` in `next.config.ts` and scope `fs.readFile` calls to literal `path.join(process.cwd(), "registry", "fonts", ...)` paths.
- **Rationale:** Dynamic `path.join(process.cwd(), variable)` causes Turbopack NFT to trace the entire repository and emit build warnings. Literal path scoping plus narrow `.ttf` globs ensures font binaries are included in the deployed `/api/og` serverless function without bundling docs or unrelated files.

## 2026-11-17 — Universal `registry:item` + `registry:file` distribution with `geist` and `zod@^4`

- **Decision:** Publish each template and `core` in `public/r/*.json` as a self-contained universal `registry:item` whose files use `type: "registry:file"` with explicit relative targets (`components/ogami/<id>.tsx`, `lib/ogami/...`), declaring `dependencies: ["zod@^4.0.0", "geist@^1.9.2"]` and rewriting `../../lib/*` to `@/lib/ogami/*` at registry build time.
- **Rationale:**
  - `shadcn@4.23.0` (`@shadcn/registry@0.2.1`) writes all registry `files[]` as UTF-8 strings (`registry:font` only configures Google Fonts CSS metadata), so `.ttf` binaries cannot be shipped inside registry JSON. Shipping `geist@^1.9.2` in `dependencies` provides `Geist-Regular.ttf` and `Geist-Bold.ttf` (SIL OFL 1.1) on disk in `node_modules/geist/dist/fonts/geist-sans/` with one install command, while `NotoSansJP-Regular.ttf` remains opt-in under `ogami/fonts/cjk/`.
  - `registry:block` / `registry:lib` triggers `shadcn init` on fresh `create-next-app` apps without `components.json`, prompting interactively and rewriting `app/globals.css` + adding Tailwind/UI dependencies (`@base-ui/react`, `tw-animate-css`, `cn`, `lucide-react`, `shadcn`). Switching to `registry:item` + `registry:file` installs with zero prompts and touches no CSS, `components.json`, or UI packages.
- **Known `src/` and alias limitations:** Because targets omit `~/`, `shadcn` automatically places files under `src/` when a `src/` directory exists (`components/ogami/<id>.tsx` → `src/components/ogami/<id>.tsx`), and because `registry:file` skips `transformImport`, `@/lib/ogami/*` works out of the box when the consumer's `tsconfig.json` maps `@/*` to `./*` (root) or `./src/*` (`--src-dir` default). Projects using a non-`@/*` import alias (such as `~/*` or `#...`), or having an unrelated `src/` folder while `app/` is at root, must adjust imports or `tsconfig.json` paths manually. Projects pinned to `zod@3.x` must upgrade to `zod@^4` because `define-template.ts` and `render.tsx` use Zod v4 APIs (`schema.def`, `.maxLength`, `z.core.$ZodIssue`).

## 2026-11-17 — ESLint only (no Prettier)

- **Decision:** Keep ESLint (`eslint-config-next` via `npm run lint`) as the sole lint/style check and do **not** install or configure Prettier, even though `docs/PROJECT_BRIEF.md` Section 6 listed `ESLint + Prettier`.
- **Rationale:** The repository already uses `eslint` (`^9`) cleanly across all files without formatting conflicts; adding Prettier would introduce an extra dev dependency and touch unrelated files with formatting sweeps without practical benefit in v1.

## 2026-11-17 — `geist@1.9.2` font sync, shared `en-US` number formatter, and non-byte-identical preview checks

- **Decision:** Sync `registry/fonts/Geist-{Regular,Bold}.ttf` to npm `geist@1.9.2` (`126,048` B / `128,868` B, `728` cmap glyphs, recorded in `registry/fonts/SOURCE.md`), run `scripts/generate-previews.ts` via `tsx` (`devDependency` only), add `registry/lib/format-number.ts` (`en-US` `"compact"` default / `"exact"` toggle with safe non-negative integer Zod bounds), and assert PNG signature + `1200x630` dimensions (not byte equality) in tests/CI.
- **Rationale:** Matches the exact font binary `geist@^1.9.2` installs in user apps, enforces `>= 0` safe integer validation (`NaN`/`Infinity`/decimals/`> MAX_SAFE_INTEGER` return 400), keeps hero milestone counters readable (`999,999` → `999.9k`, never `1000k`), and avoids cross-OS Resvg/Satori rasterization diffs failing Linux CI. (`github-repo` retains its plain `en-US` `Intl.NumberFormat` digit grouping.)

## 2026-11-17 — Gallery static previews, `marked` JSX renderer, `site.config.ts`, and `cacheComponents` `notFound()` behavior

- **Decision:**
  - Serve gallery and detail previews via explicit static PNG imports (`app/_lib/template-previews.ts`) rather than copying to `public/` or calling `/api/og`.
  - Render docs Markdown with pinned `marked@18.2.1` via a token-to-JSX renderer (`app/_lib/markdown.tsx`) that drops raw HTML tokens and allows only `http:`, `https:`, `mailto:`, and safe relative links.
  - Centralize the site URL in `site.config.ts` (`DEFAULT_SITE_URL = "https://ogami.example.com"`, overridable via `NEXT_PUBLIC_SITE_URL` for site pages), while `scripts/build-registry.ts` uses only `DEFAULT_SITE_URL` so `public/r/` is deterministic across machines/CI.
  - Use `generateStaticParams()` + `notFound()` without `export const dynamicParams = false` on `/templates/[id]` and `/docs/[slug]`.
- **Observed `cacheComponents` + `partialPrefetching` behavior (Phase 4b):** Next.js `16.4.6` forbids `dynamicParams = false` when `cacheComponents: true` is enabled. Every generated template/doc path prerenders as full static HTML (`○ (Static)`, `x-nextjs-cache: HIT`), while unknown `/templates/<id>` and `/docs/<slug>` requests serve the prerendered App Shell with HTTP `200` and stream Next's 404 UI plus `<meta name="robots" content="noindex" />`.

## 2026-11-17 — GitHub Actions CI, Node LTS pinning, and LF line-ending normalization

- **Decision:** Pin Active LTS Node `26` in `.nvmrc` for the main `.github/workflows/ci.yml` job (`lint`, `npx next typegen`, `npx tsc --noEmit`, `build`, `test`, `registry:build` + `git status --porcelain public/r/` emptiness check) and add a compatibility `node-22` job (`npm ci` + `npm test`), with `.gitattributes` forcing LF on text files and `normalizeLf` inside `scripts/build-registry.ts`.
- **Rationale:** Protects registry freshness checks on Linux CI (`ubuntu-latest`) from Windows `core.autocrlf = true` CRLF checkouts; setting `engines` to `"^22.0.0 || >=24.0.0"` aligns with `vitest@4.1.12` (`^20.0.0 || ^22.0.0 || >=24.0.0`) and both CI jobs while noting Node `22` and `ubuntu-latest` have not executed locally on this Windows Node `26` workstation.

## 2026-11-17 — Run `npx next typegen` before `npx tsc --noEmit` in CI

- **Decision:** Add `npx next typegen` before `npx tsc --noEmit` in `.github/workflows/ci.yml` rather than moving typechecking after `next build` or committing `next-env.d.ts` / `.next/types`.
- **Rationale:** Verified on Next.js `16.4.6` (`node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`) that `next typegen` generates both `next-env.d.ts` (image module declarations for static `preview.png` imports) and `.next/types/routes.d.ts` (global `LayoutProps` / `PageProps` helpers) cleanly without a full build, keeping `.gitignore` unchanged and failing fast on type errors before `npm run build`. Also confirmed `npm test` (the Node `22` job) passes with neither `next-env.d.ts` nor `.next/` present.

## 2026-11-17 — Automated `templates:sync` index/preview generation and `1280x640` repo social preview override

- **Decision:**
  - Generate `registry/templates/index.ts` and `app/_lib/template-previews.ts` deterministically via `scripts/sync-templates.ts` (`npm run templates:sync`, also invoked before `preview:build` and `registry:build`) using code-point sorted template folder names, LF line endings, and explicit static ES imports, verified for staleness in unit tests and CI.
  - Add optional `width` and `height` overrides to `RenderTemplateOptions` in `registry/lib/render.tsx` (defaulting unchanged to `template.width ?? 1200` and `template.height ?? 630`), and generate `docs/social-preview.png` at `1280x640` (`51,997` bytes) from `repo-launch` via `scripts/generate-social-preview.ts`.
- **Rationale:** Restores strict **"one contribution = one template folder"** authoring without sacrificing static `next/image` asset optimization, Turbopack compatibility, or `registry/` isolation (`registry/` still imports nothing from `app/`). Generating `docs/social-preview.png` at GitHub's recommended `1280x640` size (< 1 MB) uses Ogami's own renderer offline without modifying default `1200x630` OG card output.

## 2026-11-18 — Website UI redesign (Direction 1: Precision Registry) and Step 0 layout/typography bug fixes

- **Decision:** Execute a multi-step UI redesign of `app/` only (leaving `registry/` untouched) using **Direction 1 (Precision Registry)** with `Geist` / `Geist_Mono`, CSS variable light/dark themes (`prefers-color-scheme` + client-only `localStorage` toggle without server cookies to stay compatible with `cacheComponents: true`), static `preview.png` assets on public pages, and repo-sourced data (`allTemplates.length`, `registry/lib/platforms.ts`, `registry/lib/contrast.ts`, real `/api/og` cache headers). Start with an isolated **Step 0** fixing the `Arial` font override in `app/globals.css`, missing `min-w-0` grid children on `/templates/[id]` and `/playground`, `<pre><code>` horizontal scroll containment, inline `<code>` word breaking, and `320px` header/install-command overflow before applying visual redesign steps.
- **Rationale:** Keeps layout/overflow bug fixes isolated and verifiable before restyling components in Steps 1–5.
