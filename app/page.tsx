import Image from "next/image";
import Link from "next/link";
import { autoFit } from "@/registry/lib/auto-fit";
import {
  evaluateTemplateContrast,
  type ContrastColorPair,
} from "@/registry/lib/contrast";
import {
  PLATFORM_OVERLAYS,
  UNDOCUMENTED_PLATFORMS,
} from "@/registry/lib/platforms";
import { DEFAULT_CACHE_CONTROL } from "@/registry/lib/render";
import { BASE_SUPPORTED_SCRIPTS } from "@/registry/lib/scripts";
import { allTemplates, getTemplateById } from "@/registry/templates";
import blogPostMeta from "@/registry/templates/blog-post/meta.json";
import githubRepoMeta from "@/registry/templates/github-repo/meta.json";
import { getSiteUrlConfig } from "@/site.config";
import InstallCommand from "./_components/install-command";
import SiteHeader from "./_components/site-header";
import {
  getTemplatePreview,
  getTemplatePreviewAlt,
} from "./_lib/template-previews";

function formatScriptLabel(script: string): string {
  return script.charAt(0).toUpperCase() + script.slice(1);
}

export default function HomePage() {
  const { url: siteUrl } = getSiteUrlConfig();
  const templateCount = allTemplates.length;
  const builtInScriptsLabel = BASE_SUPPORTED_SCRIPTS.map(
    formatScriptLabel,
  ).join(" & ");

  // Static layered stack cards (3 pre-rendered preview.png imports; first uses `priority`)
  const heroStackIds = ["github-repo", "stars-milestone", "blog-post"] as const;
  const heroStack = heroStackIds.map((id) => {
    const template = getTemplateById(id);
    const preview = getTemplatePreview(id);
    if (!template || !preview) {
      throw new Error(`Missing hero stack template or preview for "${id}".`);
    }
    return { template, preview };
  });

  const [frontHeroCard, middleHeroCard, backHeroCard] = heroStack;

  // Compute live autoFit outputs from registry/lib/auto-fit.ts
  const shortTitleText = "acme/my-project";
  const longTitleText =
    "acme/resilient-open-graph-image-toolkit-for-nextjs-app";
  const autoFitOptions = {
    maxWidth: 900,
    maxLines: 2,
    maxFontSize: 62,
    minFontSize: 30,
    lineHeight: 1.15,
  };
  const shortFit = autoFit(shortTitleText, autoFitOptions);
  const longFit = autoFit(longTitleText, autoFitOptions);

  // Compute real WCAG AA contrast results from registry/lib/contrast.ts
  const githubContrast = evaluateTemplateContrast(
    githubRepoMeta.colors as ContrastColorPair[],
  );
  const blogContrast = evaluateTemplateContrast(
    blogPostMeta.colors as ContrastColorPair[],
  );
  const contrastSampleRows = [
    ...githubContrast.results.slice(0, 2).map((r) => ({
      templateId: githubRepoMeta.id,
      result: r,
    })),
    ...blogContrast.results.slice(0, 2).map((r) => ({
      templateId: blogPostMeta.id,
      result: r,
    })),
  ];

  return (
    <div className="min-w-0 flex-1 bg-background text-foreground">
      <SiteHeader active="gallery" />

      <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-10 sm:px-6 sm:py-14 lg:gap-20">
        {/* 1. Hero (Direction 1: Precision Registry) */}
        <section
          aria-labelledby="hero-heading"
          className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start"
        >
          <div className="flex min-w-0 flex-col gap-6">
            <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-accent sm:rounded-full sm:py-1">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
              />
              <span className="min-w-0">
                {templateCount} installable Next.js OG templates · Node.js
                Satori runtime
              </span>
            </div>

            <h1
              id="hero-heading"
              className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl sm:leading-[1.08]"
            >
              Code-first Open Graph images you own.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-foreground-secondary sm:text-lg">
              A Next.js-first, code-first, installable OG template registry with
              guardrails so cards cannot look broken (including script safety),
              and ready-made developer milestone cards.
            </p>

            {/* Honest script coverage summary */}
            <ul className="flex flex-wrap gap-2 text-xs text-foreground-secondary">
              <li className="rounded-md border border-border bg-surface px-2.5 py-1">
                <span className="font-semibold text-foreground">Built-in:</span>{" "}
                {builtInScriptsLabel} (Geist)
              </li>
              <li className="rounded-md border border-border bg-surface px-2.5 py-1">
                <span className="font-semibold text-foreground">Opt-in:</span>{" "}
                Japanese (NotoSansJP pack)
              </li>
              <li className="rounded-md border border-border bg-surface px-2.5 py-1">
                <span className="font-semibold text-foreground">
                  Safe fallback:
                </span>{" "}
                Devanagari, Arabic, Hangul, Simplified Chinese
              </li>
            </ul>

            <div className="flex min-w-0 flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted">
                One-line install
              </div>
              <InstallCommand itemName="github-repo" />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/playground"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-accent-strong px-5 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Open Playground
              </Link>
              <Link
                href="#templates"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Browse {templateCount} Templates
              </Link>
            </div>
          </div>

          {/* Right column: Static layered stack of preview.png + Demo GIF placeholder */}
          <div className="flex min-w-0 flex-col gap-6">
            <div
              aria-label="Featured pre-rendered template previews"
              className="flex flex-col"
            >
              <div className="mx-6 -mb-10 origin-top scale-[0.92] overflow-hidden rounded-xl border border-border bg-surface opacity-70 shadow-sm sm:mx-8 sm:-mb-14">
                <Image
                  src={backHeroCard.preview}
                  alt={getTemplatePreviewAlt(backHeroCard.template)}
                  width={backHeroCard.template.width ?? 1200}
                  height={backHeroCard.template.height ?? 630}
                  sizes="(max-width: 1024px) 90vw, 38vw"
                  className="block h-auto w-full"
                />
              </div>

              <div className="mx-3 -mb-10 origin-top scale-[0.96] overflow-hidden rounded-xl border border-border bg-surface opacity-90 shadow-sm sm:mx-4 sm:-mb-14">
                <Image
                  src={middleHeroCard.preview}
                  alt={getTemplatePreviewAlt(middleHeroCard.template)}
                  width={middleHeroCard.template.width ?? 1200}
                  height={middleHeroCard.template.height ?? 630}
                  sizes="(max-width: 1024px) 94vw, 42vw"
                  className="block h-auto w-full"
                />
              </div>

              <div className="relative overflow-hidden rounded-xl border border-border-strong bg-surface shadow-md">
                <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3.5 py-2 font-mono text-[11px] text-muted">
                  <span>{frontHeroCard.template.id}</span>
                  <span>
                    {frontHeroCard.template.width ?? 1200}×
                    {frontHeroCard.template.height ?? 630} PNG
                  </span>
                </div>
                <Image
                  src={frontHeroCard.preview}
                  alt={getTemplatePreviewAlt(frontHeroCard.template)}
                  width={frontHeroCard.template.width ?? 1200}
                  height={frontHeroCard.template.height ?? 630}
                  preload
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="block h-auto w-full"
                />
              </div>
            </div>

            {/* Demo Video / GIF placeholder (explicitly marked for Phase 6 asset) */}
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-status-warn-border bg-status-warn-subtle/40 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-status-warn">
                  Demo Video / GIF Placeholder
                </span>
                <span className="rounded border border-status-warn-border bg-surface px-2 py-0.5 font-mono text-[11px] text-status-warn">
                  Phase 6 asset
                </span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-5 text-center">
                <p className="text-sm font-medium text-foreground">
                  Demo recording placeholder
                </p>
                <p className="mt-1.5 max-w-sm text-xs leading-5 text-foreground-secondary">
                  Planned walkthrough: run{" "}
                  <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                    npx shadcn@latest add
                  </code>
                  , edit parameters live, and inspect contrast &amp; platform
                  crop overlays.
                </p>
                <Link
                  href="/playground"
                  className="mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-xs font-semibold text-accent underline underline-offset-4 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Open live Playground →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 2. How It Works in 3 Steps */}
        <section
          aria-labelledby="how-it-works-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col gap-1 border-b border-border pb-4">
            <h2
              id="how-it-works-heading"
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              How it works
            </h2>
            <p className="text-sm text-foreground-secondary">
              Install templates straight into your Next.js codebase using the
              shadcn registry format—zero wrapper packages and zero{" "}
              <code className="break-words rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                shadcn init
              </code>{" "}
              required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                Step 01 · Install
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Copy files you own
              </h3>
              <p className="text-sm leading-6 text-foreground-secondary">
                Run{" "}
                <code className="break-all rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  npx shadcn@latest add {siteUrl}/r/github-repo.json
                </code>
                . Files land in{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  components/ogami/&lt;id&gt;.tsx
                </code>{" "}
                and{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  lib/ogami/*
                </code>{" "}
                (or under{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  src/
                </code>{" "}
                when present), adding{" "}
                <code className="break-words font-mono text-xs text-foreground">
                  zod@^4.0.0
                </code>{" "}
                and{" "}
                <code className="break-words font-mono text-xs text-foreground">
                  geist@^1.9.2
                </code>
                .
              </p>
            </article>

            <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                Step 02 · Validate
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Enforce typed Zod bounds
              </h3>
              <p className="text-sm leading-6 text-foreground-secondary">
                Each template exports a Zod 4{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  params
                </code>{" "}
                schema with length caps and integer bounds plus a required{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  sample
                </code>{" "}
                checked by CI. Invalid query params return HTTP{" "}
                <code className="font-mono text-xs text-foreground">400</code>{" "}
                with field issues.
              </p>
            </article>

            <article className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-5">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-accent">
                Step 03 · Render &amp; Cache
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Serve 1200×630 PNGs on Node.js
              </h3>
              <p className="text-sm leading-6 text-foreground-secondary">
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  /api/og
                </code>{" "}
                renders via{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  next/og
                </code>{" "}
                on the default Node.js runtime (compatible with{" "}
                <code className="break-words font-mono text-xs text-foreground">
                  cacheComponents
                </code>
                ). Normal cards cache with{" "}
                <code className="break-all rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  {DEFAULT_CACHE_CONTROL}
                </code>
                ; fallback cards and errors set{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-xs text-foreground">
                  no-store
                </code>
                .
              </p>
            </article>
          </div>
        </section>

        {/* 3. Guardrails */}
        <section
          aria-labelledby="guardrails-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2
                id="guardrails-heading"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                Guardrails built into every card
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                Live checks backed directly by{" "}
                <code className="break-words rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                  registry/lib/
                </code>{" "}
                — never hardcoded marketing numbers.
              </p>
            </div>
            <Link
              href="/docs/supported-scripts"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Read Supported Scripts →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Guardrail 1: autoFit */}
            <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  1. <code className="font-mono">autoFit</code> text sizing
                </h3>
                <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                  registry/lib/auto-fit.ts
                </code>
              </div>
              <p className="text-sm leading-6 text-foreground-secondary">
                Steps font size down in <code className="font-mono">2px</code>{" "}
                increments using script-aware <code className="font-mono">em</code>{" "}
                width heuristics so long headlines fit inside the card without
                clipping.
              </p>

              <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted p-4">
                <div className="flex flex-col gap-1 border-b border-border pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-muted">
                      Short title ({shortTitleText.length} chars)
                    </span>
                    <span className="font-mono font-semibold text-status-pass">
                      {shortFit.fontSize}px · {shortFit.estimatedLines} line
                    </span>
                  </div>
                  <code className="break-words font-mono text-xs text-foreground">
                    &ldquo;{shortTitleText}&rdquo;
                  </code>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-muted">
                      Long title ({longTitleText.length} chars)
                    </span>
                    <span className="font-mono font-semibold text-accent">
                      {longFit.fontSize}px · {longFit.estimatedLines} lines · lh{" "}
                      {longFit.lineHeight}
                    </span>
                  </div>
                  <code className="break-all font-mono text-xs text-foreground">
                    &ldquo;{longTitleText}&rdquo;
                  </code>
                </div>
              </div>
            </article>

            {/* Guardrail 2: Contrast Audit */}
            <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  2. WCAG AA contrast audit
                </h3>
                <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                  registry/lib/contrast.ts
                </code>
              </div>
              <p className="text-sm leading-6 text-foreground-secondary">
                Computes WCAG 2.1 luminance ratios for the foreground/background
                hex pairs declared in each template&apos;s{" "}
                <code className="font-mono">meta.json</code> (not measured from
                rendered PNG pixels; ≥ 4.5:1 normal text, ≥ 3.0:1 large text).
              </p>

              <ul className="flex flex-col gap-2">
                {contrastSampleRows.map(({ templateId, result }) => (
                  <li
                    key={`${templateId}-${result.label}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border-strong text-[10px] font-bold"
                        style={{
                          backgroundColor: result.background,
                          color: result.foreground,
                        }}
                      >
                        Aa
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {result.label}
                        </div>
                        <div className="font-mono text-[11px] text-muted">
                          {templateId} · ≥{result.requiredRatio.toFixed(1)}:1
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-semibold text-foreground">
                        {result.ratio.toFixed(2)}:1
                      </span>{" "}
                      <span
                        className={
                          result.passes
                            ? "font-semibold text-status-pass"
                            : "font-semibold text-status-warn"
                        }
                      >
                        {result.passes ? "Pass" : "Warn"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            {/* Guardrail 3: Platform Crop Overlays */}
            <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  3. Sourced platform overlays
                </h3>
                <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                  registry/lib/platforms.ts
                </code>
              </div>
              <p className="text-sm leading-6 text-foreground-secondary">
                Inspect crop regions in the playground using sourced specs—never
                guessed dimensions.
              </p>

              <ul className="flex flex-col gap-2">
                {PLATFORM_OVERLAYS.map((platform) => (
                  <li
                    key={platform.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {platform.name}{" "}
                        <span className="font-mono text-muted">
                          ({platform.aspectRatioLabel})
                        </span>
                      </div>
                      <div className="text-[11px] text-muted">
                        <span
                          className={
                            platform.verified
                              ? "font-semibold text-status-pass"
                              : "font-semibold text-status-warn"
                          }
                        >
                          {platform.verified ? "Verified" : "Unverified"}
                        </span>{" "}
                        · Checked {platform.lastVerified}
                      </div>
                    </div>
                    {platform.sourceUrl ? (
                      <a
                        href={platform.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2.5 font-medium text-accent underline underline-offset-4 transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Source
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                <span className="font-medium text-foreground-secondary">
                  No official crop spec:
                </span>
                {UNDOCUMENTED_PLATFORMS.map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 min-w-11 items-center rounded-md px-2 text-accent underline underline-offset-4 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {item.name} ({item.checkedDate})
                  </a>
                ))}
              </div>

              <Link
                href="/playground"
                className="inline-flex min-h-11 min-w-11 w-fit items-center rounded-lg border border-border-strong bg-surface-muted px-3.5 text-xs font-semibold text-accent transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Open overlay inspector in Playground →
              </Link>
            </article>

            {/* Guardrail 4: Script Safety + CSS Mock of Fallback Card */}
            <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-foreground">
                  4. Script safety &amp; fallback card
                </h3>
                <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                  registry/lib/render.tsx
                </code>
              </div>
              <p className="text-sm leading-6 text-foreground-secondary">
                Latin &amp; Cyrillic work built in via Geist; Japanese uses the
                opt-in <code className="font-mono">NotoSansJP</code> font pack.
                Devanagari, Arabic, Hangul, and Simplified Chinese are blocked
                before Satori runs so they never render broken glyphs or HTTP
                500s—returning a clean fallback PNG (
                <code className="font-mono">Cache-Control: no-store</code>)
                containing none of the unsupported text.
              </p>

              {/* CSS-only mock of renderFallbackCard (zero /api/og call, no image asset) */}
              <div className="flex flex-col gap-2">
                <div className="text-[11px] font-medium text-muted">
                  CSS mock of{" "}
                  <code className="font-mono text-foreground">
                    renderFallbackCard
                  </code>{" "}
                  (HTTP 200 ·{" "}
                  <code className="font-mono text-foreground">
                    X-Ogami-Fallback: true
                  </code>{" "}
                  ·{" "}
                  <code className="font-mono text-foreground">no-store</code>)
                </div>
                <div
                  aria-label="CSS mock of Ogami safe fallback card showing only sanitized template name"
                  className="aspect-[1200/630] w-full rounded-lg border p-3 sm:p-4"
                  style={{
                    backgroundColor: "#09090b",
                    borderColor: "#27272a",
                    color: "#fafafa",
                  }}
                >
                  <div
                    className="flex h-full w-full flex-col justify-between rounded-md border p-3 sm:p-4"
                    style={{
                      backgroundColor: "#111113",
                      borderColor: "#27272a",
                    }}
                  >
                    <div
                      className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wider"
                      style={{
                        backgroundColor: "#18181b",
                        borderColor: "#27272a",
                        color: "#a1a1aa",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "#38bdf8" }}
                      />
                      <span>GITHUB-REPO</span>
                    </div>

                    <div
                      className="text-lg font-bold tracking-tight sm:text-2xl"
                      style={{ color: "#fafafa" }}
                    >
                      GitHub Repo
                    </div>

                    <div
                      className="flex items-center justify-between border-t pt-2 text-[11px]"
                      style={{
                        borderColor: "#27272a",
                        color: "#a1a1aa",
                      }}
                    >
                      <span>Ogami</span>
                      <span
                        aria-hidden="true"
                        className="h-1 w-6 rounded-full"
                        style={{ backgroundColor: "#38bdf8" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        {/* 4. Template Gallery (static pre-rendered PNGs only; zero /api/og calls) */}
        <section
          id="templates"
          aria-labelledby="gallery-heading"
          className="flex flex-col gap-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2
                id="gallery-heading"
                className="text-2xl font-bold tracking-tight text-foreground"
              >
                Template Gallery
              </h2>
              <p className="mt-1 text-sm text-foreground-secondary">
                {templateCount} pre-rendered 1200×630 PNG previews. Click any
                card for parameter schemas, snippets, and install commands.
              </p>
            </div>
            <Link
              href="/playground"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-accent transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try all {templateCount} in Playground →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map((template) => {
              const preview = getTemplatePreview(template.id);
              if (!preview) {
                throw new Error(
                  `Missing static preview image for template "${template.id}".`,
                );
              }

              return (
                <article
                  key={template.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-border-strong"
                >
                  <Link
                    href={`/templates/${template.id}`}
                    className="block aspect-[1200/630] w-full overflow-hidden border-b border-border bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <Image
                      src={preview}
                      alt={getTemplatePreviewAlt(template)}
                      width={template.width ?? 1200}
                      height={template.height ?? 630}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          <Link
                            href={`/templates/${template.id}`}
                            className="inline-flex min-h-11 min-w-11 items-center rounded-md py-1 transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            {template.name}
                          </Link>
                        </h3>
                        <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-muted">
                          {template.id}
                        </code>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-foreground-secondary">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-xs">
                      <Link
                        href={`/templates/${template.id}`}
                        className="inline-flex min-h-11 min-w-11 items-center rounded-md px-2 font-medium text-foreground transition hover:bg-surface-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Details &amp; install
                      </Link>
                      <Link
                        href={`/playground?template=${template.id}`}
                        className="inline-flex min-h-11 min-w-11 items-center rounded-md px-2 font-medium text-accent transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Open in Playground →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
