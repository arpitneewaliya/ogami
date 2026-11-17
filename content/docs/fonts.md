---
title: "Fonts"
description: "Default Geist fonts, disk lookup order, and the verified Japanese opt-in font pack."
order: 4
---

Ogami loads TrueType (`.ttf`) fonts from disk in Node.js via `fs.readFile` and caches each `ArrayBuffer` plus parsed `cmap` table in module memory.

## Default fonts (`geist@1.9.2`)

Every installed template lists `geist@^1.9.2` in its npm dependencies, providing Latin and Cyrillic coverage out of the box with zero extra files committed to your repo:

| File | Size (bytes) | License | Coverage |
| --- | ---: | --- | --- |
| `Geist-Regular.ttf` | `126,048` | SIL OFL 1.1 | Latin, Latin-1, covered Latin Extended, Cyrillic, basic punctuation/symbols |
| `Geist-Bold.ttf` | `128,868` | SIL OFL 1.1 | Bold (`700`) weight matching `Geist-Regular.ttf` |

### Font resolution order

At render time, `@/lib/ogami/fonts` checks literal paths in order:

1. `OGAMI_FONTS_DIR` environment variable (if set)
2. `<cwd>/registry/fonts/Geist-{Regular,Bold}.ttf` (used inside the Ogami repo itself)
3. `<cwd>/ogami/fonts/Geist-{Regular,Bold}.ttf` (optional local override directory)
4. `<cwd>/node_modules/geist/dist/fonts/geist-sans/Geist-{Regular,Bold}.ttf` (plus parent monorepo fallbacks)

## Opt-in Japanese font pack (`NotoSansJP`)

Japanese requires `NotoSansJP-Regular.ttf` (`5.70 MB`). Because committing a multi-megabyte font into every project would bloat installs for Latin/Cyrillic users, it is **opt-in**.

### Verified source details

- **File:** `NotoSansJP-Regular.ttf` (Noto Sans JP `v57`, Regular weight `400`)
- **Size:** `5,703,580` bytes (`5.70 MB`)
- **SHA-256:** `e2b91134dbbfb131454ff6237c702a73d57ec042b7c2f2cffd404167b63ac318`
- **License:** SIL Open Font License 1.1
- **Lookup path:** `ogami/fonts/cjk/NotoSansJP-Regular.ttf` (or `registry/fonts/cjk/NotoSansJP-Regular.ttf` in this repo)

### Install steps

Download directly with `curl -fSL` (verified without any custom `User-Agent` header):

```bash
mkdir -p ogami/fonts/cjk
curl -fSL "https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY1Lw_.ttf" -o ogami/fonts/cjk/NotoSansJP-Regular.ttf
```

Once installed, restart or redeploy your app so `fonts.ts` loads `NotoSansJP-Regular.ttf` automatically whenever Japanese characters are detected. Requests containing only Latin or Cyrillic **never** read the `5.70 MB` font file.

### Observed end-to-end verification (`create-next-app`)

Tested in a fresh outside-repo Next.js `16.4.6` project (`minimal-tech` card rendered with Japanese Hiragana, Katakana, and Kanji):

- **Without the pack installed:** Returned HTTP `200` `image/png` (`1200x630`, `28,547` bytes) serving the safe fallback card (`X-Ogami-Fallback: true`, `X-Ogami-Unsupported-Scripts: japanese`, `Cache-Control: no-store`) — no crash and no tofu boxes.
- **With the pack installed:** Returned HTTP `200` `image/png` (`1200x630`, `41,781` bytes) with clean Hiragana/Katakana/Kanji glyphs (`X-Ogami-Fallback` absent).
- **Local timing & memory (Next.js `next start` on Windows):**
  - Cold Japanese render: `247.4 ms` (warm render: `66.6 ms`)
  - Peak server working set (`PeakWorkingSet64`): `173.5 MB` after cold render / `174.7 MB` after warm render (from a `102.2 MB` baseline; without the `5.70 MB` font pack, peak memory was `142.3 MB`).

## Serverless file tracing (`next.config.ts`)

Add `outputFileTracingIncludes` so Next.js traces the font files for `/api/og`:

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

> **Production notice:** Vercel serverless font tracing, cold starts, and deployed function size limits with `outputFileTracingIncludes` have **not been verified on a live Vercel deployment** (Section 19 of the project brief and Section 6 of the spike report). Test with a Vercel preview deploy before relying on it in production.
