# Opt-in Japanese Font Pack

Japanese rendering (`"japanese"`: Hiragana, Katakana, and JIS Kanji) requires an opt-in static TrueType font (`NotoSansJP-Regular.ttf`) placed in this directory:

- **Target path:** `registry/fonts/cjk/NotoSansJP-Regular.ttf`
- **Family:** Noto Sans JP (`v57`, weight `400`, normal style)
- **License:** SIL Open Font License 1.1 (`https://openfontlicense.org`)
- **Size:** `5,703,580` bytes (`5.44 MiB` / `5.70 MB`)
- **Source URL:** `https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY1Lw_.ttf`

## Why this file is gitignored

Multi-megabyte font binaries are excluded from Git (`.gitignore` ignores `/registry/fonts/cjk/*.ttf` and `/registry/fonts/cjk/*.otf`) so default installs and repository clones stay small (`Geist-Regular.ttf` is `125,956` bytes).

When `NotoSansJP-Regular.ttf` is present in this directory, `registry/lib/fonts.ts` automatically includes `"japanese"` in `getSupportedScripts()` and lazy-loads the font from disk only when an input string contains Japanese characters.

## Notes on coverage

`NotoSansJP-Regular.ttf` (`v57`) covers Hiragana (`93/96`), Katakana (`96/96`), and `12,747` CJK Unified Ideographs (`U+4E00..9FFF`) used in Japanese, plus `203` CJK Extension A and `362` Compatibility Ideographs. It covers `0` Hangul syllables/jamo and omits many Simplified Chinese characters (such as `这`, `测`, `试`, `简`, `欢`), so Korean (`"hangul"`) and Simplified Chinese (`"chinese"`) remain unsupported in v1.
