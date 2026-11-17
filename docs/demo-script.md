# Launch Demo Video / GIF Script (30–60 seconds)

Matches the launch narrative in `docs/PROJECT_BRIEF.md` Section 18: *"install a template, change a parameter, see it update live."*

## Pre-recording setup

1. Start the built Ogami site locally in Terminal 1 (`npm run build && npm run start` on `http://localhost:3000`, or use your deployed preview domain).
2. Open a fresh `create-next-app` directory in Terminal 2 (`cd /tmp/demo-app`, clean prompt, large readable font size ~16–18px).
3. Have Browser Window ready at `http://localhost:3000/` (`1280×800` viewport, dark theme matching the app).

---

## Shot List & Captions

### Shot 1 — One-line install (`0:00 – 0:15`)
- **Visual:** Show Terminal 2 in a fresh Next.js project (`ls` showing no `components.json`), paste and run:
  ```bash
  npx shadcn@latest add http://localhost:3000/r/stars-milestone.json --yes
  ```
  (Replace `http://localhost:3000` with your deployed domain if recording against production.)
- **Highlight on screen:** `Created 7 files` (`components/ogami/stars-milestone.tsx`, `lib/ogami/*`), only `zod` and `geist` added, zero `components.json` or CSS rewrites.
- **Caption / Voiceover:** *"Install an Ogami template straight into Next.js with one shadcn command — you own the code."*

### Shot 2 — Live preview & parameter edit (`0:15 – 0:32`)
- **Visual:** Switch to the browser at `/playground?template=stars-milestone`. Wait 0.5s for the default `10k STARS` card to appear, then:
  1. Change `Stars` from `10000` to `1250000` -> watch hero metric immediately update to `1.2M` (`en-US` floored compact formatting).
  2. Toggle `Format` from `compact` to `exact` -> watch hero metric update to `1,250,000` (`autoFit` keeps it cleanly inside the container).
- **Caption / Voiceover:** *"Edit parameters in the live Playground — backed by the exact same `/api/og` route you copy into production."*

### Shot 3 — Guardrails in action (`0:32 – 0:50`)
- **Visual:** In `/playground`:
  1. Click `LinkedIn` and `Discord` crop overlay buttons (and briefly show `X (Unverified)` dashed outline) to verify title readability inside platform crops.
  2. Point at the **Contrast** panel (showing `4.5:1` / `3:1` checks for declared colors).
  3. Paste unsupported text like `नमस्ते` into `Tagline` -> show the rose **Unsupported script detected** warning and watch the preview switch smoothly to the safe dark fallback card (`Fallback card (devanagari)`) instead of broken glyphs or a crash.
- **Caption / Voiceover:** *"Built-in crop overlays, contrast diagnostics, and script guardrails keep every shared card safe."*

### Shot 4 — Copy snippet & close (`0:50 – 0:58`)
- **Visual:** Click **Copy snippet** (`generateMetadata` code block) or show `/` Template Gallery grid scrolling briefly across all 8 templates.
- **Caption / Voiceover:** *"Copy `generateMetadata`, deploy on Next.js, done."*

---

## Export & Integration Notes

- Export as clean MP4 / WebM or optimized GIF (keep GIF compact for README rendering, or embed `<video>`/`<img>` in `README.md` and `app/page.tsx`).
- Replace the placeholder notices in:
  - `README.md` (line 5)
  - `app/page.tsx` (lines 60–85)
