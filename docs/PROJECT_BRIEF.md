# Project Brief: Ogami

> **Read this first.** This is a context document, not a build order. It explains what the project is, why it exists, how it is meant to work, and the order in which it should be built. **Do not try to build everything in one go.** Work one phase at a time (Section 14), stop at the end of each phase, summarize what you did, and wait for the owner's go-ahead before starting the next one.

---

## 0. How to work on this project

1. Read the whole document before writing any code.
2. Build in **phases** (Section 14). Each phase has deliverables and acceptance criteria. Finish a phase, report, and stop.
3. **Do not scaffold things from later phases** "just in case". Keep each phase small and reviewable.
4. **Verify against current documentation** before using any API or file format: Next.js (App Router, `next/og`), Satori, and the shadcn registry format. These change. Do not rely on memory, and tell the owner when docs and this brief disagree.
5. If a requirement here turns out to be impossible or a bad idea (for example, a font or script that Satori cannot render correctly), **stop and report it with options and a recommendation**. Do not silently work around it or quietly drop the requirement.
6. If something is ambiguous, ask. Offer 2 to 3 options with a recommendation.
7. Prefer small commits with clear messages. Keep the repo runnable at the end of every phase.
8. Do not invent facts (platform image sizes, library behavior, licenses). Look them up and record the source.

---

## 1. What this project is

**Ogami** is an open-source toolkit for generating **Open Graph / social preview images** (the 1200x630 card that appears when a link is shared on X, LinkedIn, Discord, Slack, WhatsApp) in **Next.js** projects.

It is **code-first**, not a drag-and-drop design website:

- A **template** is a single React file that describes one card design.
- Users **install templates into their own project** (the files are copied in, so they own and can edit them), in the same spirit as shadcn/ui.
- A small **runtime** turns a template plus parameters into a PNG using `next/og` (Satori under the hood).
- A **playground** shows live previews while editing.
- A **website** doubles as the template gallery, the docs, and the registry that users install from.

Everything is **stateless**: no database, no accounts, no stored user data.

---

## 2. Goals

The owner wants this project to:

- Be genuinely useful to Next.js developers who need good-looking OG images without designing them by hand.
- Attract **GitHub stars, users, and outside contributors**. Contributing must be easy: **one contribution = one template folder**.
- Cost **$0** to run in its early life.
- Be a strong **portfolio/resume project**: clean architecture, tests, CI, documentation.
- Possibly attract **sponsors** later. This is a future bonus, not a v1 feature (see Section 18).

---

## 3. Non-goals for v1

Do **not** build these in v1 unless the owner explicitly asks:

- A visual drag-and-drop / Figma-like editor.
- User accounts, authentication, or any database.
- Paid tiers, payments, or a sponsor system in the code.
- Live data fetching (for example GitHub API stats). In v1, users type numbers into template parameters.
- Support for frameworks other than Next.js.
- A custom CLI (v1 uses the shadcn registry install flow; see Section 11).
- Correct rendering of complex scripts that Satori cannot shape (Devanagari/Indic, Arabic/RTL). Phase 0 showed these do not work in `next/og`; the owner chose to defer them (see Section 10.2). Do not start HarfBuzz/pre-shaping work in v1.
- An Edge runtime build of the image route. v1 uses the default Node.js runtime.

---

## 4. Competitive context and differentiation

The market is not empty. Existing projects include:

- **nuxt-og-image**: the closest equivalent for Nuxt (Vue components as templates, dev playground, Satori rendering, screenshot mode, sponsor program).
- **OG Studio**: a Figma-like visual editor with templates and SVG/PNG/URL export.
- **ogimage.click**: a free editor with templates, gradients, overlays, and meta tag snippets.
- **ogimage.org**: a paid starter kit of Next.js OG templates.
- **Satori / @vercel/og**: the rendering engine this project builds on.

So "yet another OG editor" is not the pitch. The pitch is:

> **A Next.js-first, code-first, installable OG template registry with guardrails so cards cannot look broken (including script safety), and ready-made developer milestone cards.**

The three differentiators (details in Section 10):

1. **Guardrails**: text auto-fit, contrast warnings, platform crop/safe-area overlays.
2. **Script safety**: Phase 0 found that Satori renders Latin and Japanese correctly but misspells Devanagari and crashes on Arabic. Instead of failing silently or with a 500, Ogami detects unsupported scripts, warns in the playground, and serves a safe fallback card. Complex-script shaping is deferred to a possible v2 research project (Section 10.2).
3. **Milestone cards**: templates for things developers share on X (repo launch, release, "1,000 stars", npm downloads milestone).

---

## 5. How it works (concept)

```
User's Next.js app
  page.tsx -> generateMetadata() -> og:image = /api/og?template=github-repo&name=...&stars=1200
                                           |
                                           v
                              app/api/og/route.tsx (GET)
                                - parse + validate params (zod, length caps)
                                - look up template by id
                                - load fonts for the text's scripts
                                - render with ImageResponse (next/og)
                                - return PNG with cache headers
                                           |
                                           v
                     X / LinkedIn / Discord / Slack fetch the PNG URL
```

Two integration paths should eventually be documented:

- **Dynamic**: one `/api/og` route that picks a template from query params.
- **Per-route**: a template used inside a route's `opengraph-image.tsx` (Next.js file convention).

Verify the current Next.js conventions for both before documenting them.

---

## 6. Tech stack

- **Next.js** (App Router) and **TypeScript** (strict mode).
- **`next/og`** (`ImageResponse`, Satori) for rendering, on the default **Node.js runtime**. Phase 0 found that Next.js 16 deprecates the Edge runtime and that `cacheComponents: true` fails the build if a route exports `runtime`. The generated `/api/og` route must therefore **not** export `runtime`, and must stay compatible with `cacheComponents`.
- **Tailwind CSS** for the website and playground UI only. **Templates must not depend on Tailwind** (see Section 9).
- **zod** for template parameter schemas and request validation.
- **Vitest** (or similar) for tests.
- **ESLint + Prettier**, GitHub Actions for CI.
- **npm** as the package manager. Use `npm install`, `npm run ...` and `npx` in all scripts, docs, CI, and the README (do not introduce pnpm or yarn). Commit `package-lock.json`.

Keep dependencies minimal. Justify any new dependency in the PR or commit message.

---

## 7. Repository layout (single Next.js app, one repo)

v1 is **one Next.js project**, not a monorepo. The website, playground, and registry are all in the same app. Split into packages only later if a custom CLI or installable runtime package is needed.

```
ogami/
  app/
    page.tsx                  # landing + template gallery
    templates/[id]/page.tsx   # template detail page (preview, params, install command)
    playground/page.tsx       # live preview + parameter editor
    api/og/route.tsx          # renders cards from query params
  registry/                   # SELF-CONTAINED: only imports from inside registry/
    lib/
      define-template.ts      # defineTemplate helper + types
      render.ts               # renderTemplate (params -> ImageResponse)
      fonts.ts                # font loading + script detection
      auto-fit.ts             # text fitting helper
      contrast.ts             # WCAG contrast helper
      platforms.ts            # per-platform crop/safe-area data (with sources)
    templates/
      <template-id>/
        template.tsx
        meta.json             # name, description, author, tags, version
        preview.png           # generated by script/CI, not hand-made
    fonts/                    # small default Latin font only (open license); CJK fonts are an opt-in pack, not committed
  public/r/                   # generated registry JSON files (do not hand-edit)
  scripts/
    build-registry.ts         # builds public/r/*.json from registry/
    generate-previews.ts      # renders every template's sample to preview.png
  .github/
    workflows/ci.yml
    ISSUE_TEMPLATE/
  LICENSE  README.md  CONTRIBUTING.md
```

**Important rule:** keep `registry/` self-contained. Templates and helpers must not import from the website code (`app/`). This keeps it easy to extract into a package later.

---

## 8. The template contract

Every template follows one shape, so contributors only touch their own folder. This is **illustrative**; refine it in Phase 1.

```tsx
// registry/templates/github-repo/template.tsx
import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  name: z.string().max(60),
  description: z.string().max(140).default(""),
  stars: z.number().int().nonnegative().optional(),
});

export default defineTemplate({
  id: "github-repo",
  name: "GitHub Repo",
  description: "Card for announcing or sharing a repository.",
  params,
  // Used by the playground, the gallery, previews, and CI.
  sample: { name: "my-repo", description: "A short description of the repo", stars: 1200 },
  render: (p, ctx) => (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: 64 }}>
      <div style={{ display: "flex", fontSize: 72 }}>{p.name}</div>
      <div style={{ display: "flex", fontSize: 32 }}>{p.description}</div>
    </div>
  ),
});
```

Requirements for the contract:

- `id` is unique and matches the folder name.
- `params` is a zod schema; **every text field has a maximum length**.
- `sample` is **required**. CI renders every template from its `sample`.
- `render` returns Satori-compatible JSX (Section 9).
- `ctx` provides things like width, height, the resolved fonts, and helpers such as `autoFit`.
- Templates must work without network access at render time, except for optional user-provided image URLs, which must fail gracefully.

---

## 9. Rendering rules and constraints (Satori)

These constraints come from Satori. Verify them against current Satori docs, and put the verified list in `CONTRIBUTING.md`.

- **Flexbox only.** No CSS Grid. Any element with more than one child must set `display: "flex"`.
- Prefer **inline `style` objects** over Tailwind classes inside templates, for reliability.
- **Fonts must be provided explicitly** (bundled files). TTF and OTF are preferred; WOFF is supported but slower to parse; WOFF2 is not supported. System fonts are not available. The docs mention a 500 KB bundle limit for `ImageResponse`; Phase 0 found it is not enforced by the library at runtime and applies to bundled assets (mainly Edge), so load fonts from disk on Node.js (see Section 10.2).
- Not all CSS is supported. Do not assume; check the supported-properties list.
- External images (logos, avatars) can fail or be slow. Handle failure gracefully and enforce size and length limits.
- Output size is **1200x630** unless a template documents otherwise.
- Cap every text input length at the parameter level, and also guard against overflow in the layout.

---

## 10. Differentiating features

### 10.1 Guardrails (so cards cannot look broken)

- **`autoFit`**: reduces font size so long titles still fit. v1 can use simple length/width-based heuristics; a later version can measure text using real font metrics. Decide and document in Phase 1.
- **Contrast checker** (playground): compute WCAG contrast between text and background colors and warn below roughly 4.5:1 (3:1 for large text).
- **Safe-area / crop overlays** (playground): show how each platform may crop or display the card. **Do not hardcode values from memory.** Put them in `registry/lib/platforms.ts`, each with a source URL and a "last verified" date.

### 10.2 Script safety and font support (revised after Phase 0)

**Phase 0 results** (details in `docs/spike-report.md`; Next.js 16.4.6, `next/og`, Noto Sans fonts):

- **Latin:** works.
- **Japanese:** works with Noto Sans JP, but that font is about 5.7 MB, and lines can break in the middle of a Katakana word.
- **Devanagari (Hindi):** **broken.** Satori does not apply Indic shaping. Conjuncts show visible halant marks, and the short-i vowel sign is placed after the consonant, producing misspelled words. This is an engine limitation, so a different font is not expected to fix it.
- **Arabic:** **crashes** (HTTP 500) with Noto Sans Arabic (`lookupType: 5 - substFormat: 3 is not yet supported`). Other Arabic fonts and RTL behavior were not tested.
- **Owner decision: Option A.** v1 supports Latin, plus CJK through an opt-in font pack, and does not claim support for complex scripts. HarfBuzz-based pre-shaping is deferred to a possible v2 research project. Do not start it.

**What v1 builds instead: script safety**

- Detect the scripts used in every text parameter by Unicode ranges (Latin, CJK, Devanagari/Indic, Arabic/Hebrew, Thai and other complex scripts, and so on).
- Keep a small `supportedScripts` list in `registry/lib/fonts.ts`: Latin, plus Japanese/Chinese/Korean when the CJK font pack is installed. Everything else counts as unsupported or unverified.
- **Playground:** show a clear warning when text contains an unsupported script, naming the script and the reason.
- **Renderer:** never crash and never output visibly misspelled text. When an unsupported script is found, `renderTemplate` returns a typed error (for example `UnsupportedScriptError`), and the `/api/og` route serves a safe fallback card that contains none of the unsupported text. Make this behavior configurable. Propose the exact fallback design in Phase 1 and get the owner's approval before finalizing it. Avoid long-lived caching of fallback responses.
- **CI:** every template's `sample` data must use supported scripts, and a test must confirm that unsupported-script input takes the guarded path instead of crashing.
- **Docs:** a "Supported scripts" page stating what works, what does not, and why.

**Fonts**

- Commit one small default Latin font (target under about 200 KB, using a subset or a compact open-licensed family; verify the license) so templates work out of the box.
- Japanese/CJK is an **opt-in font pack**. Do not commit multi-megabyte fonts. Provide a documented install step (for example a script that downloads a font and records its source and license), and consider subsetting later.
- Load fonts with `fs.readFile(path.join(process.cwd(), ...))`, cache them in module memory, and load per script only when needed.
- Verify that Vercel's file tracing includes the font files (Next.js has an `outputFileTracingIncludes` option; confirm in the current docs), ideally with a Vercel preview deploy.
- CJK line breaking: Satori may split Katakana words across lines. Treat as a known limitation and consider handling it in wrapping or `autoFit` later.

### 10.3 Milestone cards

Templates for things developers share on social media:

- `repo-launch`, `release`, `stars-milestone`, `npm-downloads-milestone`.
- v1: all numbers are **user-supplied parameters**. No live API calls.

---

## 11. Registry and install flow

Goal: a user can run one command and get a template as a file they own.

- Use the **shadcn registry format** so existing tooling (`npx shadcn add <url>`) works, instead of building a custom CLI in v1. **Verify the current registry item schema and CLI behavior in the shadcn docs before implementing**, since they change.
- `scripts/build-registry.ts` reads `registry/` and generates JSON files into `public/r/`. These are served by the website itself.
- Each registry item includes the template file(s), the shared helper files it needs (`define-template`, `render`, `fonts`, etc.), and its npm dependencies.
- **Acceptance test:** in a **fresh** `create-next-app` project, run the install command, add the `/api/og` route per the docs, and get a working card. This must be tested in a separate project, not inside this repo.

A custom `npx ogami add ...` CLI is a possible later step. Do not build it in v1.

---

## 12. Playground

A page (`/playground`) with:

- Template picker.
- A form generated from the template's zod schema.
- Live preview (render via the same `/api/og` route).
- Platform crop/safe-area overlays and the contrast warning (Section 10.1).
- Sample data loader and "copy URL" / "copy code snippet" buttons.

Keep it simple. This is a developer tool, not a design suite.

---

## 13. Gallery website

- Landing page: one-sentence pitch, the install command, a demo GIF/video, and a grid of templates.
- Template detail page: preview, parameter table, install command, usage snippet.
- Docs pages (Markdown): quick start, how to write a template, Satori rules, fonts, FAQ.
- **Use pre-rendered `preview.png` files for the gallery.** Do not render live images for every gallery visitor (see Section 17).

---

## 14. Build phases

For every phase: **build only that phase, run the checks, summarize, and stop.**

### Phase 0: Spike (COMPLETED)

- Create a Next.js + TypeScript app. Add one `/api/og` route returning an `ImageResponse` with a hardcoded template.
- Test English, Hindi, Japanese, and Arabic strings.
- Decide runtime (Node vs Edge) with evidence (render time, bundle size, font loading).
- **Deliverable:** a short written report (in `docs/spike-report.md`) with findings, screenshots, and a recommendation on whether the multi-script differentiator is viable.
- **Status: done.** Results are in `docs/spike-report.md`: Node.js runtime chosen; Devanagari and Arabic are not viable in Satori; the owner chose Option A (Section 10.2). The spike routes are temporary and must not be carried into the main codebase.

### Phase 1: Core library and first templates

- First, clean up after Phase 0: remove the temporary spike routes (`/api/og-edge`, spike pages and cases), restore `cacheComponents` and `partialPrefetching` in `next.config.ts`, and make sure no route exports `runtime`.
- Implement `defineTemplate`, `renderTemplate`, font loader (Node.js, `fs.readFile`), `autoFit`, and script detection with the safe fallback behavior from Section 10.2 (propose the fallback design first and wait for approval).
- Commit one small default Latin font (verify its license and size).
- Add 3 templates (for example `minimal-tech`, `github-repo`, `blog-post`).
- Params validated with zod; length caps enforced.
- **Acceptance:** `/api/og?template=...` renders all three; invalid params return a clear error; unsupported-script input returns the safe fallback instead of crashing; the build passes with `cacheComponents` enabled; unit tests for validation, `autoFit`, and script detection.

### Phase 2: Registry and install

- Implement `build-registry.ts` and generate `public/r/*.json`.
- **Acceptance:** installing one template into a fresh Next.js app works end to end (Section 11).

### Phase 3: Playground

- Build the playground (Section 12), including overlays and contrast warning.
- **Acceptance:** all templates are editable live with correct overlays; platform data has sources and dates.

### Phase 4: Gallery, more templates, docs

- Grow to 8 to 10 templates, including the milestone cards.
- Build the gallery, template detail pages, and docs.
- Add `generate-previews.ts` and commit the generated previews.
- **Acceptance:** every template has a preview, a detail page, and an install command that works.

### Phase 5: CI and open-source setup

- Add the CI described in Section 15.
- Add LICENSE, README, CONTRIBUTING, issue templates.
- Add 6 to 8 well-scoped "good first issue" tickets (as a list for the owner to create).
- **Acceptance:** a first-time contributor can add a template by following CONTRIBUTING.md alone.

### Phase 6: Launch polish

- README hero (demo GIF placeholder + one-line install), social preview image for the repo (made with the project itself), performance and caching review.
- **Acceptance:** a final checklist is reviewed by the owner.

---

## 15. Quality bar and CI

On every pull request, CI should:

1. Lint and typecheck.
2. Build the app.
3. Render **every template from its `sample`** and fail if rendering throws.
4. Check that each output is a valid PNG of the expected size.
5. Verify that each template has `id` matching its folder, `meta.json`, a `sample`, and length-capped params.
6. Rebuild the registry and fail if `public/r/` is out of date.
7. Run unit tests.

Keep CI fast. Cache dependencies.

---

## 16. Open-source setup

- **License:** MIT.
- **README:** one-sentence pitch, demo GIF at the top, install command directly under it, short feature list, link to the gallery, contribution link.
- **CONTRIBUTING.md:** "Add a template in 5 minutes", with a copyable boilerplate folder, the Satori rules, the checklist CI enforces, and the font/asset licensing rules.
- **Issue templates:** bug report and template request.
- **Licensing rules for contributors:** templates must be original designs; fonts must be open-licensed; no copying other products' designs or using trademarked logos beyond what is needed.
- `FUNDING.yml` and sponsor setup come later (Section 18).

---

## 17. Hosting, cost, and performance

- Target: **$0 to build and launch.** Planned host is Vercel.
- Vercel's free **Hobby** plan is limited to **personal, non-commercial use**. Selling sponsor placements on the site would count as commercial use and would need a paid plan or a different host. Re-check the current terms before enabling any sponsor placement.
- Hobby also has monthly usage limits, and hitting them pauses the site. Image rendering uses compute, so protect against a launch-day spike:
  - Gallery uses **pre-rendered `preview.png`** files, not live rendering.
  - Live rendering is used only in the playground and in users' own projects.
  - `/api/og` responses must set **cache headers** so the same card is not re-rendered for every request.
- Users who install templates render images on **their own** hosting, not on this project's server.
- Use the default Node.js runtime. Fonts are read from disk at render time, so check that font files are included in the deployed function (Section 10.2).
- Re-verify current plan limits at vercel.com/pricing before launch.

---

## 18. Launch and monetization context (for awareness only)

Do not implement any of this in v1; it explains design choices.

- Launch plan: a short screen recording ("install a template, change a parameter, see it update live") posted on X, then shared on developer communities.
- Sponsorship idea for later: a "your brand here" sponsor slot on the website and README, plus GitHub Sponsors / Buy Me a Coffee. This only makes sense after the project has real traffic.
- Stars and sponsors are **not guaranteed**. The project should be worth using and worth contributing to regardless.

---

## 19. Risks and open questions

- **Satori limitations** may restrict designs; document them rather than fighting them.
- **Complex scripts (Devanagari, Arabic) do not work in Satori** (Phase 0). Mitigated by script safety (Section 10.2); true support would need a separate shaping layer and is deferred to v2 research.
- **Production behavior is untested:** Phase 0 ran only locally, so Vercel file tracing, cold starts, and font loading in production still need a preview deploy.
- **Font size:** CJK fonts are multi-megabyte, so they stay opt-in and are loaded only when needed.
- **CJK line breaking** can split Katakana words across lines.
- **shadcn registry format** may change; pin the verified approach and note the docs version used.
- **Platform crop behavior** changes over time; data must be sourced and dated.
- **Crowded market:** differentiation depends on execution of the guardrails, scripts, and milestone cards, plus a good launch.
- Open question for the owner: the domain, and confirming that the npm package name `ogami` and the GitHub repo name are available (the name Ogami is decided).

---

## 20. Conventions

- TypeScript strict mode, no `any` without a comment explaining why.
- Small, focused commits; one concern per commit.
- Keep functions small and tested; keep `registry/` free of website imports.
- Write comments for *why*, not *what*.
- Record decisions in `docs/decisions.md` (short entries with date and rationale).
- When unsure, stop and ask rather than guess.

---

## 21. Definition of done for v1

- A fresh Next.js app can install at least 8 templates with one command each and render correct 1200x630 cards.
- The playground, gallery, and docs are live.
- Guardrails (autoFit, contrast warning, crop overlays) work and their data is sourced.
- Script safety works: Latin renders correctly, CJK works with the opt-in font pack, and unsupported scripts produce a warning and a safe fallback instead of broken text or a crash, with a "Supported scripts" doc page.
- CI passes and enforces the template contract.
- A new contributor can add a template using only CONTRIBUTING.md.
