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
