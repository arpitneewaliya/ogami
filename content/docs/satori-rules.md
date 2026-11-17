---
title: "Satori Rules"
description: "Verified layout, CSS, font, and runtime constraints for next/og templates."
order: 3
---

Ogami renders templates using `ImageResponse` from `next/og`, which uses **Satori** and **Resvg** under the hood (verified against `next@16.4.6` / `@vercel/og@1.0.1`).

## Layout and styling

- **Flexbox only — no CSS Grid:** Satori does not support CSS Grid (`display: "grid"`).
- **Explicit `display: "flex"`:** Any element with more than one child (or text mixed with elements) must declare `display: "flex"`. Setting `display: "flex"` on every `<div>` container avoids ambiguity.
- **Inline `style` objects only inside templates:** Templates must not depend on Tailwind CSS classes. Use explicit pixel or percentage values in inline `style` objects.
- **Standard card dimensions:** Output defaults to `1200x630` unless a template overrides `width` and `height`.
- **Overflow protection:** Pair `.max(n)` Zod limits with `ctx.autoFit(...)`, `wordBreak: "break-word"`, and `overflow: "hidden"` on text containers so long unbroken tokens cannot clip outside the card.

> **Verify CSS properties before relying on them:** Satori supports a subset of CSS flexbox, typography, borders, and backgrounds. Do not assume unverified CSS features (complex filters, CSS custom properties, `calc()`, or experimental layouts) work identically to Chromium without rendering and checking the PNG.

## Fonts and bundle size limits

- **Explicit bundled fonts only:** System fonts are not available in Satori. Ogami loads `.ttf` font files explicitly via `fs.readFile`.
- **Supported font formats:** Next.js `16.4.6` (`image-response.md`) documents `.ttf`, `.otf`, and `.woff` support, preferring `.ttf` or `.otf` for parsing speed; **`.woff2` is not supported**.
- **About the `500 KB` limit in `next/og` docs:** Phase 0 testing showed that `@vercel/og` does not enforce a `500 KB` cap at runtime in Node.js (the spike rendered `6.67 MB` of local `.ttf` fonts without error). The `500 KB` note applies to statically bundled route/Edge assets. Reading fonts from disk on the Node.js runtime keeps them out of the compiled JS bundle.

## Runtime requirements (Next.js 16)

- **Default Node.js runtime:** Do **not** export `export const runtime = "edge"` or `export const runtime = "nodejs"`. Next.js 16 deprecates the Edge runtime, and `cacheComponents: true` fails the build on any `runtime` route segment export.
- **Zero network requests at render time:**
  - Templates must not fetch fonts or remote assets dynamically during rendering unless explicitly designed to fail gracefully.
  - Satori fetches Twemoji SVGs from `cdn.jsdelivr.net` if emoji characters reach `ImageResponse`. To keep rendering deterministic and offline-safe, `renderTemplate` strips emoji by default (reporting `X-Ogami-Warnings`) or routes them to the safe fallback card when `emoji=fallback`.

## Text wrapping caveats

- **Katakana line breaking:** As observed in the Phase 0 spike report, Satori breaks long Japanese headlines at character boundaries and can split Katakana loanwords across lines (`レンダリン` / `グ`). Design headline containers with generous width and `autoFit` headroom.

Next: check [Fonts](/docs/fonts) and [Supported Scripts](/docs/supported-scripts).
