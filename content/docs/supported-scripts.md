---
title: "Supported Scripts"
description: "Which scripts Ogami renders out of the box, which require opt-in fonts, and how unsupported scripts fall back safely."
order: 5
---

Instead of crashing or silently outputting broken ligatures and missing-glyph tofu boxes, Ogami classifies incoming text parameters by script before rendering and routes unsupported scripts to a guarded fallback card.

## Support matrix

| Script | Status | Behavior & Reason |
| --- | --- | --- |
| **Latin** (ASCII, Latin-1, covered Latin Extended, Vietnamese) | **Supported** (built-in) | Rendered cleanly by bundled `Geist-Regular.ttf` & `Geist-Bold.ttf`; verified in Phase 0 spike and `cmap` unit tests. |
| **Cyrillic** (Russian, Ukrainian, covered Cyrillic) | **Supported** (built-in) | Covered by `Geist-Regular.ttf` & `Geist-Bold.ttf` and checked against the binary `cmap` in tests. |
| **Japanese** (Hiragana, Katakana, JIS Kanji) | **Supported** (opt-in pack) | Works cleanly with opt-in `NotoSansJP-Regular.ttf` (`5.70 MB`). Satori may break Katakana words mid-word across lines. Without the pack installed, triggers the safe fallback card. |
| **Greek** | **Unsupported** (font coverage) | Default `Geist-Regular.ttf` does **not** cover the Greek alphabet — only a few symbols exist in `Geist` (`Λ`, `Ω`, `λ`, `µ`, `π`). All Greek block letters (`U+0370..U+03FF`, `U+1F00..U+1FFF`) are flagged so partial Greek strings trigger safe fallback instead of tofu. *(This is a default-font coverage boundary, not a Satori engine limitation. Neutral Ohm sign `U+2126` is treated as covered symbol.)* |
| **Hangul (Korean)** | **Unverified / unsupported** | Not tested in the Phase 0 spike; covered by neither `Geist` nor `NotoSansJP`. Flagged as unsupported in v1. |
| **Chinese (Simplified & Traditional)** | **Unverified / unsupported** | Not tested in the Phase 0 spike. `NotoSansJP` omits common Simplified Chinese characters (`东`, `为`, `图`, `库`, etc.), so Chinese text is flagged to avoid silent missing glyphs. |
| **Emoji** | **Unsupported** (offline rule) | `next/og` requests Twemoji SVG assets from `cdn.jsdelivr.net` for emoji graphemes, violating offline rendering. `renderTemplate` strips emoji by default (emitting `X-Ogami-Warnings`) or serves fallback when `?emoji=fallback`. |
| **Devanagari & Indic scripts** | **Unsupported** (Satori engine) | Phase 0 spike proved Satori (`opentype.js`) does not apply Indic OpenType reordering: conjuncts show explicit halants and pre-base short-i `ि` is placed after the consonant, producing misspelled words. |
| **Arabic** | **Unsupported** (Satori crash) | Phase 0 spike with `NotoSansArabic-Regular.ttf` threw HTTP `500` (`Error: lookupType: 5 - substFormat: 3 is not yet supported`). Alternative Arabic fonts and RTL behavior were not tested. |
| **Hebrew** | **Unverified / unsupported** | Not tested in the Phase 0 spike; RTL layout and Hebrew diacritic shaping are unverified in v1. |
| **Thai & Southeast Asian scripts** | **Unverified / unsupported** | Not tested in the Phase 0 spike; complex mark positioning and word segmentation are unverified/unsupported in Satori. |

## Safe fallback card behavior

When `renderTemplate` detects any unsupported script (for example Hindi `नमस्ते`, Arabic `مرحبا`, Greek `Ελληνικά`, Korean `안녕하세요`, or Japanese without the `NotoSansJP` pack installed):

1. It does **not** crash (`500`) and does **not** render misshaped or tofu text.
2. `/api/og` returns **HTTP `200`** (`image/png`, `1200x630`) with a neutral dark-mode fallback card displaying only the safe template badge (`SAFE PREVIEW` or template ID) and safe label (`fallbackLabel` or template name). **None of the caller's unsupported text is rendered.**
3. Response headers clearly signal the guarded path and bypass long-lived caching:
   - `Cache-Control: no-store`
   - `X-Ogami-Fallback: true`
   - `X-Ogami-Unsupported-Scripts: <comma-separated-scripts>`

In the [Playground](/playground), any unsupported script or stripped emoji displays an immediate diagnostic alert naming the exact field, script, sample character, and reason.
