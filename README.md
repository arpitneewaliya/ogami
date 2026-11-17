# Ogami

**A Next.js-first, code-first, installable OG template registry with guardrails so cards cannot look broken (including script safety), and ready-made developer milestone cards.**

> **Demo GIF / Video Placeholder (Phase 6 asset):** Planned 10-second walkthrough showing `npx shadcn add`, live editing in `/playground`, contrast diagnostics, and platform crop overlays.

## Quick Install

Install any template directly into your Next.js App Router project (`zod@^4` required; no `shadcn init` needed):

```bash
npx shadcn@latest add https://ogami.example.com/r/github-repo.json
```

> **Placeholder URL notice:** `https://ogami.example.com` is a placeholder domain until a production domain is chosen. Set `NEXT_PUBLIC_SITE_URL` when deploying the Ogami gallery site.

See [Quick Start](content/docs/quick-start.md) (or `/docs/quick-start` on the site) for the `app/api/og/route.tsx` snippet, `--src-dir` / `@/*` path alias notes, and `generateMetadata` usage.

## Features

- **Own the code:** Distributed as self-contained `registry:item` JSON files (`components/ogami/<id>.tsx` and `lib/ogami/*`), adding only `zod@^4.0.0` and `geist@^1.9.2` with zero `components.json` or `globals.css` edits.
- **Layout & visual guardrails:** `autoFit` title sizing, WCAG contrast checks for declared `meta.json` color pairs in `/playground`, and sourced crop overlays (`LinkedIn`, `Facebook`, `Discord`, plus `X` marked unverified; `Slack` and `WhatsApp` have no official crop spec).
- **Script safety & safe fallback card:** Validates text against real TrueType `cmap` coverage before calling `ImageResponse`, strips emoji by default (preventing external Twemoji CDN requests), and serves a clean `200 image/png` (`Cache-Control: no-store`) fallback card instead of broken shaping or crashes.
- **Developer milestone cards:** `repo-launch`, `release`, `stars-milestone`, and `npm-downloads-milestone` alongside `minimal-tech`, `github-repo`, `blog-post`, and `docs-page`. Built-in number formatting uses `en-US` rules (`format-number.ts` compact `k`/`M`/`B`/`T` floored to 1 decimal, with `exact` toggle; `github-repo` uses plain `en-US` digit grouping).
- **Static gallery:** `/` and `/templates/[id]` use pre-rendered `1200x630` `preview.png` assets with zero live `/api/og` calls.

## Supported Scripts Summary

| Script | Status | Notes |
| --- | --- | --- |
| **Latin & Cyrillic** | Supported (built-in) | Rendered cleanly via bundled `geist@1.9.2` (`Geist-Regular.ttf` & `Geist-Bold.ttf`, SIL OFL 1.1). |
| **Japanese** (Hiragana, Katakana, JIS Kanji) | Supported (opt-in) | Requires downloading `NotoSansJP-Regular.ttf` (`5.70 MB`, SIL OFL 1.1) into `ogami/fonts/cjk/`. Katakana words may wrap mid-word across lines. |
| **Greek** | Unsupported (font coverage) | Default `Geist` font does not cover the Greek alphabet (not a Satori limitation); flagged to trigger safe fallback. |
| **Hangul (Korean) & Chinese** | Unverified / unsupported | Not tested in Phase 0 spike; flagged to avoid silent tofu boxes. |
| **Emoji** | Unsupported (offline rule) | Stripped by default (`X-Ogami-Warnings`) or routed to fallback (`?emoji=fallback`) so Satori does not fetch Twemoji from `cdn.jsdelivr.net`. |
| **Devanagari / Indic, Arabic, Hebrew, Thai** | Unsupported / unverified | Satori lacks complex Indic/RTL shaping and crashes on `NotoSansArabic-Regular.ttf` (`lookupType: 5 - substFormat: 3`); routed to safe fallback card. |

## Links & Unverified Environments

- **Gallery & Docs routes:** Run `npm run dev` and open `/` (Gallery), `/playground`, and `/docs`.
- **Contribute a template:** Follow [CONTRIBUTING.md](CONTRIBUTING.md) (`one contribution = one folder` via `npm run templates:sync`).
- **Launch & Demo docs:** [Production & Launch Checklist](docs/launch-checklist.md) and [Demo Recording Script](docs/demo-script.md).
- **License:** MIT ([LICENSE](LICENSE)).

> **Verification status:**
> - **Verified:** Local Windows builds/tests (`Node 26`), fresh `create-next-app` installs (`--no-src-dir`, `--src-dir`, and Japanese opt-in pack), and GitHub Actions `ubuntu-latest` CI (`Node 26` and `Node 22` jobs).
> - **Unverified in production:** Vercel serverless font tracing (`outputFileTracingIncludes`), live Vercel CDN caching headers, and cold/warm serverless render timings (see [docs/launch-checklist.md](docs/launch-checklist.md)).
