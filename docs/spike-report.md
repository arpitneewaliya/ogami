# Phase 0 Spike Report: Multi-Script Rendering & Runtime Evaluation

**Date:** 2026-11-16  
**Next.js Version:** `16.4.6` (Turbopack, React `19.3.0`, `@vercel/og` `1.0.1` bundled via `next/og`)  
**Environment:** Local Windows workstation, Node.js `v24.13.0`  
**Spike Code (Temporary):** [app/api/og/route.tsx](file:///d:/MY_DEV_PROJECTS/ogami/app/api/og/route.tsx), [app/api/og-edge/route.tsx](file:///d:/MY_DEV_PROJECTS/ogami/app/api/og-edge/route.tsx), [app/api/og/_spike-cases.tsx](file:///d:/MY_DEV_PROJECTS/ogami/app/api/og/_spike-cases.tsx), [app/spike-compare/page.tsx](file:///d:/MY_DEV_PROJECTS/ogami/app/spike-compare/page.tsx)

---

## 1. Executive Summary & Recommendations

### Verdict 1 — Runtime: Use **Node.js** (default runtime, without `export const runtime`)

1. **Next.js `16.4.6` deprecates the Edge Runtime.** During `next build`, Next.js emits:
   `⚠ The Edge Runtime is deprecated. You can use the "nodejs" runtime instead.`
   (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/runtime.md`).
2. **`cacheComponents: true` forbids `export const runtime`.** This repo's `next.config.ts` ships with `cacheComponents: true` and `partialPrefetching: true` enabled. When `cacheComponents` is enabled, Next.js 16 fails the build on **both** `export const runtime = "edge"` and `export const runtime = "nodejs"` (`Route segment config "runtime" is not compatible with nextConfig.cacheComponents. Please remove it.`). We had to temporarily comment out `cacheComponents` and `partialPrefetching` in [next.config.ts](file:///d:/MY_DEV_PROJECTS/ogami/next.config.ts) just to run this two-route spike. In Phase 1, we should remove `/api/og-edge`, remove `export const runtime` from `/api/og` (which defaults to Node.js), and re-enable `cacheComponents: true`.
3. **Node.js was faster locally and supports filesystem font loading.** Node.js cold start (`180.98 ms` server / `257.04 ms` HTTP) beat Edge (`345.39 ms` server / `416.29 ms` HTTP), and warm server medians were `21.05–27.89 ms` on Node vs. `31.27–40.08 ms` on Edge. Node also loads local `.ttf` files directly via `readFile(path.join(process.cwd(), ...))` without HTTP self-fetching.

### Verdict 2 — Multi-Script Differentiator: **Partially Viable (Latin + CJK work; Devanagari & Arabic fail in `next/og`)**

| Script | Visual Quality in Satori (`next/og`) | Viable for v1 as-is? | Primary Blocker / Caveat |
| :--- | :--- | :--- | :--- |
| **English (Latin)** | Crisp, matches browser | **Yes** | Full `NotoSans-Regular.ttf` is 556 KB (>500 KB); use a smaller subset or Latin font (`Geist-Regular.ttf` / `Inter`). |
| **Japanese (Hiragana, Katakana, Kanji)** | Legible, matches browser glyphs | **Yes (with font-loading strategy)** | `NotoSansJP-Regular.ttf` is **5.70 MB**; Satori also wraps Katakana mid-word (`レンダリン` / `グ`). |
| **Hindi (Devanagari)** | **Broken shaping** | **No** | Lacks complex OpenType shaping: conjuncts render with explicit halant (`स्‍ते`, `क्‍ष`, `ब्‍ध`) and short-i matra `ि` is not reordered before consonants (`कतिाब`, `लपिि`, `दुनयिा`). |
| **Arabic (RTL & BiDi)** | **Server crash (HTTP 500)** | **No** | `NotoSansArabic-Regular.ttf` throws `Error: lookupType: 5 - substFormat: 3 is not yet supported` in Satori/`opentype.js`. |

> [!WARNING]
> **Owner Decision Needed Before Phase 1:** Because `next/og` (Satori) cannot shape Devanagari accurately and crashes on `NotoSansArabic-Regular.ttf`, the "multi-script font support (Devanagari + Arabic RTL)" differentiator in `docs/PROJECT_BRIEF.md` cannot ship safely with plain `next/og` text rendering.
>
> **Options:**
> - **Option A (Recommended for v1):** Narrow v1's multi-script promise to **scripts Satori renders faithfully** (Latin + CJK such as Japanese/Chinese/Korean via lazy/subsetted fonts), and explicitly document Devanagari/Indic and Arabic/RTL as unsupported by Satori until v2.
> - **Option B:** Add a HarfBuzz WASM (`harfbuzzjs`) + BiDi (`bidi-js`) pre-shaping layer that converts complex scripts into inline SVG `<path>` elements before passing them to Satori. Significant complexity (custom line-breaking + extra WASM dependency) for v1.
> - **Option C:** Replace `next/og`/Satori with headless Chromium (Playwright) or a HarfBuzz-backed engine. Violates the `$0` lightweight serverless target for v1.

---

## 2. Fonts Tested (Source, License, Exact Sizes)

Font files are stored locally under `public/spike-fonts/` and excluded from git via [.gitignore](file:///d:/MY_DEV_PROJECTS/ogami/.gitignore) (`/public/spike-fonts/`). All four `.ttf` URLs were resolved from the Google Fonts CSS2 API (using a legacy Android User-Agent so Google Fonts serves static TrueType `.ttf` files rather than `.woff`/`.woff2`).

| File | Font Family | License | Exact File Size | Source URL (`fonts.gstatic.com`) |
| :--- | :--- | :--- | :--- | :--- |
| `NotoSans-Regular.ttf` | Noto Sans (`v42`, wght 400) | SIL Open Font License 1.1 | `556,300` bytes (`543.3 KiB` / `556.3 KB`) | `https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d41X6zQ.ttf` |
| `NotoSansDevanagari-Regular.ttf` | Noto Sans Devanagari (`v33`, wght 400) | SIL Open Font License 1.1 | `215,004` bytes (`210.0 KiB` / `215.0 KB`) | `https://fonts.gstatic.com/s/notosansdevanagari/v33/TuGoUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQCQmHn6B2OHjbL_08AlXQly-AzploX.ttf` |
| `NotoSansJP-Regular.ttf` | Noto Sans JP (`v57`, wght 400) | SIL Open Font License 1.1 | `5,703,580` bytes (`5.44 MiB` / `5.70 MB`) | `https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY1Lw_.ttf` |
| `NotoSansArabic-Regular.ttf` | Noto Sans Arabic (`v33`, wght 400) | SIL Open Font License 1.1 | `192,120` bytes (`187.6 KiB` / `192.1 KB`) | `https://fonts.gstatic.com/s/notosansarabic/v33/nwpxtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlhQ5l3sQWIHPqzCfyGyvu3CHFQM.ttf` |
| **Total (all 4 fonts)** | — | SIL OFL 1.1 | **`6,667,004` bytes (`6.36 MiB` / `6.67 MB`)** | — |

---

## 3. Verification of the 500 KB Limit & Options for Large Fonts

### What Next.js `16.4.6` Docs State

In [image-response.md](file:///d:/MY_DEV_PROJECTS/ogami/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md#L51) (`Behavior` section), Next.js `16.4.6` documents:

> - Maximum bundle size of `500KB`. The bundle size includes your JSX, CSS, fonts, images, and any other assets. If you exceed the limit, consider reducing the size of any assets or fetching at runtime.
> - Only `ttf`, `otf`, and `woff` font formats are supported. To maximize the font parsing speed, `ttf` or `otf` are preferred over `woff`.

*(Note: this updates Section 9 of `PROJECT_BRIEF.md`—`.woff` is supported alongside `.ttf`/`.otf`, though `.ttf`/`.otf` parse faster.)*

### Which Runtimes It Applies To (Node.js vs. Edge)

1. **In `@vercel/og` runtime code (`1.0.1`)**: Neither `node_modules/next/dist/compiled/@vercel/og/index.node.js` nor `index.edge.js` enforces a 500 KB limit programmatically at runtime. In this local spike, both `/api/og` (Node.js) and `/api/og-edge` (Edge) successfully rendered `ImageResponse` while loading **6.67 MB** of fonts (`NotoSans-Regular.ttf` alone is **556.3 KB**, and `NotoSansJP-Regular.ttf` is **5.70 MB**).
2. **Where the 500 KB limit applies**: The `500KB` note in Next.js docs refers to **bundled route/function assets** (historically Edge Function bundle budgets when importing fonts/images statically into the Edge route bundle, where Vercel's Edge Runtime enforces tight code+asset bundle ceilings).
   - **Edge Runtime (`runtime = "edge"`)**: You cannot statically bundle `NotoSansJP-Regular.ttf` (5.70 MB) or even `NotoSans-Regular.ttf` (556 KB) inside an Edge route without hitting bundle size caps (and `runtime = "edge"` is deprecated in Next.js 16). Fetching 5.70 MB over HTTP on every cold Edge isolate also risks Edge memory/CPU limits in production.
   - **Node.js Runtime (default)**: Using `fs.readFile(path.join(process.cwd(), ...))`—the exact pattern shown in Next.js 16's own [image-response.md](file:///d:/MY_DEV_PROJECTS/ogami/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md#L163-L202) `Custom fonts` example—reads font files from disk at runtime rather than inlining them into the compiled JS bundle. On serverless Node.js (e.g., Vercel Functions), standard Node.js function deployment limits are dramatically larger (up to 250 MB uncompressed / 50 MB compressed on AWS Lambda-backed functions), though traced assets in `public/` or `registry/fonts/` still count toward deployment tracing size and cold-start disk I/O.

### Options for Fonts Exceeding 500 KB (e.g., `NotoSansJP-Regular.ttf` at 5.70 MB)

| Option | How It Works | Pros | Cons / Trade-offs |
| :--- | :--- | :--- | :--- |
| **1. Node.js `fs.readFile` + Lazy Per-Script Loading** | Keep fonts on disk, detect scripts in input text, and only `readFile` the needed font(s) (caching in module memory). | Zero network dependency at render time; deterministic; English/Latin requests never touch the 5.70 MB JP font. | Requires Node.js runtime; traced font files still increase serverless function bundle size on deploy; cold CJK request still reads 5.7 MB. |
| **2. Static Font Subsetting** | Strip unused glyphs from `NotoSansJP-Regular.ttf` (e.g., keep Hiragana, Katakana, ASCII, and top ~2,000–3,000 Joyo Kanji) or subset `NotoSans-Regular.ttf` to Latin-1/Latin Extended (`<100 KB`). | Shrinks Latin TTF well below 150 KB and JP TTF substantially (typically 1–2 MB instead of 5.7 MB); faster `opentype.js` parsing. | Rare Kanji outside the subset fall back to missing-glyph tofu boxes. |
| **3. Dynamic Runtime Font Fetching (Google Fonts CSS API w/ `?text=`)** | Request `https://fonts.googleapis.com/css2?family=...&text=<encodedChars>` at runtime (or CDN), which returns a tiny single-request subset (`~5–30 KB`). | Tiny font payload (`<30 KB` even for Japanese); zero font files bundled in user repos; works under strict Edge/500 KB limits. | **Violates Section 8 of `PROJECT_BRIEF.md`** ("Templates must work without network access at render time"); adds external latency + Google Fonts reliability/rate-limit dependency. |
| **4. Dual-Mode / Opt-In CJK Font Pack** | Bundle a small Latin font (`<150 KB`) by default; allow templates or projects needing Japanese to opt into an optional `NotoSansJP` asset or runtime fetch fallback. | Keeps default install fast and tiny (`<150 KB`) for 90% of users while supporting JP cleanly for users who want it. | Extra configuration step for CJK users. |

---

## 4. Multi-Script Rendering Findings (Browser HTML vs. Satori PNG)

All 7 test cases were rendered side-by-side at [app/spike-compare/page.tsx](file:///d:/MY_DEV_PROJECTS/ogami/app/spike-compare/page.tsx) using identical `@font-face` `.ttf` files in Chromium and Satori (`/api/og`). Rendered PNGs are saved in `docs/spike-assets/`.

### Case 1 (`en`): English (Latin)
- **String:** `"Ogami: Code-first Open Graph images for Next.js"` / `"The quick brown fox jumps over the lazy dog — 0123456789"`
- **Satori Output:** [en.png](file:///d:/MY_DEV_PROJECTS/ogami/docs/spike-assets/en.png) (`1200×630`, `53,148` bytes on Node; `38,791` bytes on Edge)
- **Comparison vs. Browser:** Renders cleanly and matches Chromium's Plain HTML rendering (slight expected rasterization/antialiasing differences only).

### Case 2 (`hi`): Hindi (Devanagari)
- **String:** `"नमस्ते दुनिया — देवनागरी लिपि और संयुक्ताक्षर परीक्षण"` / `"किताब, बुद्धि, राष्ट्रीय, प्रकृति, क्षत्रिय, ज्ञान, श्रृंगार"`
- **Satori Output:** [hi.png](file:///d:/MY_DEV_PROJECTS/ogami/docs/spike-assets/hi.png) (`1200×630`, `50,971` bytes)
- **Comparison vs. Browser:** **Severe shaping defects in Satori.** Chromium Plain HTML shapes all conjuncts and matras properly; Satori (`opentype.js`) does not apply Devanagari OpenType reordering or conjunct substitutions:
  - **Pre-base short-i matra (`ि`, `U+093F`) fails to reorder left of the base consonant:**
    - `"दुनिया"` renders visually with `ि` placed after `न`/`य` (`दुनयि`).
    - `"लिपि"` renders as `लपि`.
    - `"किताब"` renders as `कतिाब`.
    - `"बुद्धि"` renders `ि` trailing after `ध`.
    - `"प्रकृति"` renders `ि` trailing after `त`.
    - `"क्षत्रिय"` renders `ि` after `र` instead of before `त्र`.
  - **Conjunct consonants (संयुक्ताक्षर) fail to ligate, rendering explicit virama/halant marks instead:**
    - `"नमस्ते"` → explicit halant `स्‍ते` (instead of half-स + त).
    - `"संयुक्ताक्षर"` → `क्‍त` and `क्‍ष`.
    - `"परीक्षण"` → `क्‍ष`.
    - `"बुद्धि"` → `द्‍ध`.
    - `"राष्ट्रीय"` → `ष्‍ट्‍र` (failed `ष्ट` + rakar).
    - `"प्रकृति"` → `प्‍र` (failed rakar `प्र`).
    - `"क्षत्रिय"` → `क्‍ष` + `त्‍र`.
    - `"ज्ञान"` → `ज्‍ञ` (failed `ज्ञ` ligature).
    - `"श्रृंगार"` → `श्‍रृ` (failed `श्र` ligature).

### Case 3 (`ja`): Japanese (Hiragana, Katakana, Kanji)
- **String:** `"こんにちは世界 — 日本語フォントと文字レンダリングのテスト"` / `"次世代のオープンソース OG 画像ツールキット (1200×630)"`
- **Satori Output:** [ja.png](file:///d:/MY_DEV_PROJECTS/ogami/docs/spike-assets/ja.png) (`1200×630`, `57,243` bytes)
- **Comparison vs. Browser:** All Hiragana, Katakana, and Kanji glyphs render accurately via font fallback from `Noto Sans` to `Noto Sans JP`. One minor typographic observation: the headline wraps mid-Katakana word (`レンダリン` / `グのテスト`), matching Chromium's CSS line-break positions under the same width, though Satori shows slightly wider letter tracking/lighter antialiasing than Chromium.

### Case 4 (`ar`): Arabic (Pure RTL & Contextual Shaping)
- **String:** `"مرحبا بالعالم — اختبار تشكيل الحروف والاتجاه من اليمين لليسار"` / `"تصميم بطاقات المعاينة الاجتماعية للمطورين بسهولة"`
- **Satori Output:** **Failed — HTTP 500 (`naturalWidth === 0` in browser comparison)** on both `?case=ar` and `?case=ar&rtl=1`, on both Node.js and Edge.
- **Server Error Observed:**
  `Error: lookupType: 5 - substFormat: 3 is not yet supported`
- **Comparison vs. Browser:** Chromium Plain HTML renders both default-direction and `dir="rtl"` Arabic cleanly with full cursive joining. Satori throws an unhandled exception when shaping Arabic with `NotoSansArabic-Regular.ttf` because its bundled `opentype.js` GSUB parser does not support OpenType Contextual Substitution (`LookupType 5`, `SubstFormat 3`).

### Case 5 (`mixed`): Mixed Latin + Devanagari + Japanese (Single Line)
- **String:** `"Ogami v0.1 • नमस्ते दुनिया • こんにちは世界"` / `"Single-line multi-script fallback: Latin + हिन्दी + 日本語"`
- **Satori Output:** [mixed.png](file:///d:/MY_DEV_PROJECTS/ogami/docs/spike-assets/mixed.png) (`1200×630`, `53,386` bytes)
- **Comparison vs. Browser:** Multi-font fallback across all three scripts on a single line works (`Noto Sans` → `Noto Sans Devanagari` → `Noto Sans JP`), and baseline alignment is clean. However, the embedded Hindi segment still suffers from broken shaping (`नमस्‍ते दुनयि` and `हन्दिी` in the subtitle), whereas Chromium renders all three scripts accurately.

### Case 6 (`bidi`): Bidirectional (Arabic + English + Numbers)
- **String:** `"إصدار Ogami v1.0 حقق 1,250 نجمة على GitHub في 48 ساعة!"` / `"دمج النص العربي مع Next.js 16 و TypeScript والأرقام 2026"`
- **Satori Output:** **Failed — HTTP 500 (`naturalWidth === 0`)** on both `?case=bidi` and `?case=bidi&rtl=1`, on both Node.js and Edge, due to the same `lookupType: 5 - substFormat: 3 is not yet supported` crash in `NotoSansArabic-Regular.ttf`.
- **Comparison vs. Browser:** Chromium Plain HTML (with `dir="rtl"`) interleaves RTL Arabic phrases with LTR English tokens (`Ogami v1.0`, `GitHub`, `Next.js 16`, `TypeScript`) and numbers (`1,250`, `48`, `2026`) in correct reading order. Satori could not produce an image.

### Case 7 (`hi-wrap`): Long Hindi Title (Multi-line Wrapping)
- **String:** `"ओगामी: नेक्स्ट.जेएस डेवलपर्स के लिए कोड-फ़र्स्ट ओपन ग्राफ़ इमेज टूलकिट जो बिना किसी डिज़ाइन टूल के सुंदर सोशल प्रीव्यू कार्ड बनाता है"` / `"लंबी शीर्षक पंक्तियों के स्वचालित रैपिंग और मात्रा संरेखण का परीक्षण"`
- **Satori Output:** [hi-wrap.png](file:///d:/MY_DEV_PROJECTS/ogami/docs/spike-assets/hi-wrap.png) (`1200×630`, `70,052` bytes)
- **Comparison vs. Browser:** Both Satori and Chromium wrap the headline into **3 lines** without overflowing the card bounds. However, Satori exhibits the same pervasive Devanagari shaping failures across wrapped lines (`नेक्‍स्ट`, `डेवलपर्‍स`, `लएि`, `फ़र्‍स्‍ट`, `ग्‍राफ़`, `टूलकटि`, `बनिा`, `कसिी`, `डजि़ाइन`, `प्‍रीव्‍यू`, `कार्‌ड`, `स्‍वचालति`, `रैपगि`).

---

## 5. Runtime Benchmark Results (Node.js vs. Edge)

> [!NOTE]
> **Relative Benchmark Caveat:** All timings below were measured locally against `npm run start` (`next start`) on Windows (`http://localhost:3000`). Local `next start` runs both runtimes inside the same local Node process/machine without cold container spin-up, network transit, or Vercel Edge isolate throttling. **These numbers are relative only and are NOT representative of production latency.**
>
> **Production Untested:** Deploying the spike routes to a Vercel preview was not possible in this environment (no `vercel` CLI installed and no linked Vercel account). **Production Vercel behavior is untested.**

### Cold Start (First Request After `npm run start`, `case=en`)

| Runtime / Route | Font Loading Mechanism | HTTP Status | Client Total (ms) | Server Render `X-Render-Time-Ms` (ms) | PNG Size (bytes) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node.js** (`/api/og`) | `fs.readFile(path.join(process.cwd(), ...))` | `200` | `257.04` | `180.98` | `53,148` |
| **Edge** (`/api/og-edge`) | `fetch(new URL("/spike-fonts/...", request.url))` | `200` | `416.29` | `345.39` | `38,791` |

*(Note: Both routes yielded identical visual output for `en`, while Edge's `index.edge.js` / WASM PNG encoder produced a smaller PNG payload of `38,791` bytes vs. Node's `53,148` bytes.)*

### Warm Requests (Median of 10 Sequential Requests per Case)

| Case | Node Client Median (ms) | Node Server Median (ms) | Node Min–Max Client (ms) | Edge Client Median (ms) | Edge Server Median (ms) | Edge Min–Max Client (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `en` | `26.23` | `23.43` | `24.46 – 29.73` | `34.53` | `32.06` | `33.17 – 39.91` |
| `hi` | `24.22` | `22.21` | `22.85 – 25.83` | `33.41` | `31.27` | `32.63 – 34.92` |
| `ja` | `24.68` | `22.65` | `23.26 – 28.24` | `33.86` | `31.69` | `33.48 – 43.52` |
| `ar` | `ERR (500 ×10)` | `—` | `—` | `ERR (500 ×10)` | `—` | `—` |
| `mixed` | `22.86` | `21.05` | `21.77 – 24.50` | `34.06` | `32.05` | `33.45 – 34.81` |
| `bidi` | `ERR (500 ×10)` | `—` | `—` | `ERR (500 ×10)` | `—` | `—` |
| `hi-wrap` | `29.80` | `27.89` | `28.99 – 32.63` | `42.12` | `40.08` | `41.15 – 50.05` |

---

## 6. What I did not test

- **Live Vercel deployment (Node.js Serverless & Edge):** No `vercel` CLI or linked Vercel project was available; production cold starts, output file tracing sizes with `5.70 MB` fonts, Edge isolate memory limits, and CDN caching headers (`Cache-Control`) remain untested in production.
- **Alternative Arabic fonts:** Only Google Fonts `NotoSansArabic-Regular.ttf` (`v33`) was tested. Older/simpler Arabic TTFs that avoid GSUB `lookupType: 5, substFormat: 3` (such as `Amiri`, `Cairo`, or older Noto releases) were not tested, though `opentype.js` RTL/BiDi fidelity would still be suspect without HarfBuzz.
- **Alternative Devanagari fonts:** Only `NotoSansDevanagari-Regular.ttf` (`v33`) was tested; because `ि` reordering and conjunct shaping are engine-level (HarfBuzz vs. `opentype.js`), swapping fonts alone is unlikely to fix Devanagari in Satori, though this was not experimentally verified across other fonts.
- **Other scripts mentioned in `PROJECT_BRIEF.md`:** Chinese (`zh-CN`/`zh-TW`), Korean (`ko-KR`), Hebrew (`he-IL`), and Southeast Asian complex scripts (Thai, Bengali, Tamil) were not tested.
- **Multiple font weights/styles (700 Bold, Italic) & Emoji:** Only `400` Regular weights were tested; `emoji` SVGs (`twemoji` network fetch in Satori) alongside multi-script text were not tested.
- **Satori's `loadAdditionalAsset` callback:** Dynamic per-glyph/per-script font loading via Satori's `loadAdditionalAsset` option was not tested.
- **High concurrency / memory profiling:** Warm timings were sequential (`10` runs/case), not concurrent load tests.

---

## 7. Open risks

1. **Multi-script differentiator scope risk:** Two of the headline non-Latin scripts in `docs/PROJECT_BRIEF.md` (Hindi/Devanagari and Arabic/RTL) either render illegibly/misspelled (Devanagari) or throw HTTP 500 (Arabic) in `next/og` (`@vercel/og` `1.0.1`). Shipping broken Devanagari or crashing Arabic templates would directly contradict Ogami's "guardrails so cards cannot look broken" value proposition.
2. **Font asset size vs. Vercel Hobby / Serverless limits:** Passing multiple scripts adds `6.67 MB` of `.ttf` files (`5.70 MB` for Japanese alone). Even in Node.js mode, tracing multi-megabyte font files into a Next.js template package (especially via `npx shadcn add`) may bloat user repositories and serverless deployment sizes unless fonts are lazy-loaded, subsetted, or split per script.
3. **`cacheComponents: true` vs. `runtime` config in Next.js 16:** Users adopting Ogami on Next.js 16 with `cacheComponents: true` will hit a hard build failure if any installed route template exports `export const runtime = ...`. Ogami's generated `/api/og` route must omit `export const runtime` entirely (relying on the default Node.js runtime) and ensure it stays compatible with `cacheComponents`.
4. **CJK line-wrapping aesthetics:** Satori breaks Japanese lines cleanly at character boundaries without crashing, but can split Katakana loanwords awkwardly across lines (e.g., `レンダリン` / `グ`) depending on title length and container width.
5. **Production deployment gap:** Because Vercel preview testing could not be run, Vercel-specific output tracing (`public/` vs. `registry/fonts/`) and serverless memory/timeout behavior on Node.js with `fs.readFile` remain unverified until deployed by the owner.
