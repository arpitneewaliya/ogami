import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  evaluateTemplateContrast,
  type ContrastColorPair,
} from "@/registry/lib/contrast";
import { DEFAULT_CACHE_CONTROL } from "@/registry/lib/render";
import { BASE_SUPPORTED_SCRIPTS } from "@/registry/lib/scripts";
import { allTemplates, getTemplateById } from "@/registry/templates";
import {
  buildOgApiPath,
  extractPlaygroundFields,
  type JsonSchemaObject,
} from "@/app/playground/schema-form";
import CopyButton from "@/app/_components/copy-button";
import InstallCommand from "@/app/_components/install-command";
import SiteHeader from "@/app/_components/site-header";
import { extractTemplateParamTable } from "@/app/_lib/schema-table";
import {
  getTemplatePreview,
  getTemplatePreviewAlt,
} from "@/app/_lib/template-previews";

interface TemplateMetaFile {
  author?: string;
  tags?: string[];
  version?: string;
  colors?: ContrastColorPair[];
}

function loadTemplateMeta(id: string): TemplateMetaFile {
  const metaPath = path.join(
    process.cwd(),
    "registry",
    "templates",
    id,
    "meta.json",
  );
  const raw = readFileSync(metaPath, "utf8");
  return JSON.parse(raw) as TemplateMetaFile;
}

export function generateStaticParams(): Array<{ id: string }> {
  return allTemplates.map((template) => ({ id: template.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) {
    return {
      title: "Template Not Found",
    };
  }
  return {
    title: template.name,
    description: template.description,
  };
}

function buildUsageSnippet(templateName: string, ogUrl: string): string {
  return [
    'import type { Metadata } from "next";',
    "",
    "export function generateMetadata(): Metadata {",
    `  const ogImage = ${JSON.stringify(ogUrl)};`,
    "",
    "  return {",
    `    title: ${JSON.stringify(templateName)},`,
    "    openGraph: {",
    "      images: [{ url: ogImage, width: 1200, height: 630 }],",
    "    },",
    "    twitter: {",
    '      card: "summary_large_image",',
    "      images: [ogImage],",
    "    },",
    "  };",
    "}",
  ].join("\n");
}

function formatScriptName(script: string): string {
  return script.charAt(0).toUpperCase() + script.slice(1);
}

async function TemplateDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = getTemplateById(id);
  if (!template) {
    notFound();
  }

  const preview = getTemplatePreview(template.id);
  if (!preview) {
    notFound();
  }

  const meta = loadTemplateMeta(template.id);
  const paramRows = extractTemplateParamTable(template);
  const contrastReport = evaluateTemplateContrast(meta.colors, template.sample);
  const builtInScriptsLabel = BASE_SUPPORTED_SCRIPTS.map(formatScriptName).join(
    " & ",
  );

  const jsonSchema = z.toJSONSchema(template.params, {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchemaObject;
  const fields = extractPlaygroundFields(jsonSchema);
  const stringifiedSample: Record<string, string | boolean> = {};
  for (const field of fields) {
    const raw = template.sample[field.name];
    if (field.kind === "boolean") {
      stringifiedSample[field.name] = Boolean(raw);
    } else if (raw !== undefined && raw !== null) {
      stringifiedSample[field.name] = String(raw);
    } else {
      stringifiedSample[field.name] = "";
    }
  }
  const sampleOgPath = buildOgApiPath(template.id, fields, stringifiedSample);
  const metadataSnippet = buildUsageSnippet(template.name, sampleOgPath);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-8 sm:px-6 sm:py-12">
      {/* Breadcrumb & Heading */}
      <div className="flex flex-col gap-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-muted"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 min-w-11 items-center rounded-md px-2 font-medium text-foreground-secondary transition hover:bg-surface-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Templates
          </Link>
          <span aria-hidden="true">/</span>
          <span className="break-all font-mono text-foreground">
            {template.id}
          </span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {template.name}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-foreground-secondary">
              {template.description}
            </p>
            {meta.tags && meta.tags.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-foreground-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href={`/playground?template=${template.id}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-accent-strong px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open in Playground →
          </Link>
        </div>
      </div>

      {/* Preview + Install */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <Image
            src={preview}
            alt={getTemplatePreviewAlt(template)}
            width={template.width ?? 1200}
            height={template.height ?? 630}
            preload
            sizes="(max-width: 1024px) 100vw, 60vw"
            className="block h-auto w-full object-contain"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-muted px-4 py-2.5 text-xs text-muted">
            <span>
              Pre-rendered sample ({template.width ?? 1200}×
              {template.height ?? 630} PNG)
            </span>
            {meta.author ? <span>By {meta.author}</span> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-border bg-surface p-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Install Template
            </h2>
            <p className="text-xs leading-5 text-foreground-secondary">
              Copies{" "}
              <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                components/ogami/{template.id}.tsx
              </code>{" "}
              and core helpers into{" "}
              <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                lib/ogami/*
              </code>{" "}
              (or under{" "}
              <code className="break-words rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                src/
              </code>{" "}
              when present). Installs{" "}
              <code className="break-words font-mono text-foreground">
                zod@^4.0.0
              </code>{" "}
              and{" "}
              <code className="break-words font-mono text-foreground">
                geist@^1.9.2
              </code>
              .
            </p>
            <InstallCommand itemName={template.id} />
          </div>

          <div className="flex min-w-0 flex-col gap-2 border-t border-border pt-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Dynamic /api/og URL
            </h2>
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-1.5">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-xs text-foreground">
                {sampleOgPath}
              </code>
              <CopyButton text={sampleOgPath} label="Copy URL" />
            </div>
            <p className="break-words text-[11px] leading-5 text-muted">
              Normal cards return{" "}
              <code className="break-all rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                Cache-Control: {DEFAULT_CACHE_CONTROL}
              </code>
              ; safe fallback cards and{" "}
              <code className="font-mono text-foreground">400</code>/
              <code className="font-mono text-foreground">404</code> responses
              set{" "}
              <code className="rounded border border-border bg-surface-muted px-1 py-0.5 font-mono text-foreground">
                no-store
              </code>
              .
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
            <Link
              href="/docs/quick-start"
              className="inline-flex min-h-11 min-w-11 items-center rounded-lg border border-border bg-surface-muted px-3 font-medium text-accent transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Route setup guide →
            </Link>
            <Link
              href="/docs/supported-scripts"
              className="inline-flex min-h-11 min-w-11 items-center rounded-lg border border-border bg-surface-muted px-3 font-medium text-foreground-secondary transition hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Supported scripts →
            </Link>
          </div>
        </div>
      </section>

      {/* Parameter Table (cards below sm, 5-column table on sm+) */}
      <section
        aria-labelledby="params-heading"
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="params-heading"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Parameters
          </h2>
          <span className="font-mono text-xs text-muted">
            {paramRows.length} {paramRows.length === 1 ? "field" : "fields"} ·
            Zod 4 schema
          </span>
        </div>

        {/* Mobile stacked cards (<640px) */}
        <ul className="flex flex-col gap-3 sm:hidden">
          {paramRows.map((row) => {
            const constraintText =
              row.maxLength !== undefined
                ? `max ${row.maxLength} chars`
                : row.minimum !== undefined || row.maximum !== undefined
                  ? `${row.minimum ?? "−∞"} .. ${row.maximum ?? "∞"}`
                  : "—";

            return (
              <li
                key={row.name}
                className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <code className="break-all font-mono text-sm font-semibold text-accent">
                    {row.name}
                  </code>
                  {row.required ? (
                    <span className="rounded border border-status-warn-border bg-status-warn-subtle px-2 py-0.5 text-xs font-medium text-status-warn">
                      Required
                    </span>
                  ) : (
                    <span className="rounded border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                      Optional
                    </span>
                  )}
                </div>

                <dl className="grid grid-cols-1 gap-1.5 border-t border-border pt-2.5 text-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="font-medium text-muted">Type</dt>
                    <dd className="break-all font-mono text-foreground">
                      {row.type}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="font-medium text-muted">Constraints</dt>
                    <dd className="break-all font-mono text-foreground-secondary">
                      {constraintText}
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <dt className="font-medium text-muted">Default</dt>
                    <dd className="break-all font-mono text-foreground-secondary">
                      {row.defaultValue ?? "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>

        {/* Desktop & tablet 5-column table (>=640px) */}
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="border-b border-border px-4 py-3 font-semibold">
                  Name
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold">
                  Type
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold">
                  Required
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold">
                  Max Length / Range
                </th>
                <th className="border-b border-border px-4 py-3 font-semibold">
                  Default
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground-secondary">
              {paramRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-accent">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">
                    {row.type}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.required ? (
                      <span className="rounded border border-status-warn-border bg-status-warn-subtle px-2 py-0.5 font-medium text-status-warn">
                        Required
                      </span>
                    ) : (
                      <span className="text-muted">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-secondary">
                    {row.maxLength !== undefined
                      ? `max ${row.maxLength} chars`
                      : row.minimum !== undefined || row.maximum !== undefined
                        ? `${row.minimum ?? "−∞"} .. ${row.maximum ?? "∞"}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground-secondary">
                    {row.defaultValue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Guardrails: Declared Color Contrast + Script Support */}
      <section
        aria-labelledby="template-guardrails-heading"
        className="flex min-w-0 flex-col gap-4"
      >
        <h2
          id="template-guardrails-heading"
          className="text-xl font-bold tracking-tight text-foreground"
        >
          Contrast &amp; Script Guardrails
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contrast card sourced from registry/lib/contrast.ts */}
          <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">
                Declared color pair contrast
              </h3>
              <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                registry/lib/contrast.ts
              </code>
            </div>
            <p className="text-xs leading-5 text-foreground-secondary">
              Evaluated with <code className="font-mono">evaluateTemplateContrast</code>{" "}
              against the foreground/background hex pairs declared in{" "}
              <code className="break-all font-mono">
                registry/templates/{template.id}/meta.json
              </code>{" "}
              using sample params (not measured from rendered pixels).
            </p>

            {contrastReport.declaredCount === 0 ? (
              <p className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-muted">
                No color pairs declared in <code className="font-mono">meta.json</code>.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {contrastReport.results.map((item) => (
                  <li
                    key={item.label}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                      item.passes
                        ? "border-border bg-surface-muted"
                        : "border-status-warn-border bg-status-warn-subtle/40"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border-strong text-[10px] font-bold"
                        style={{
                          backgroundColor: item.background,
                          color: item.foreground,
                        }}
                      >
                        Aa
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground">
                          {item.label}
                        </div>
                        <div className="font-mono text-[11px] text-muted">
                          {item.largeText
                            ? `Large text / UI (≥${item.requiredRatio.toFixed(1)}:1)`
                            : `Normal text (≥${item.requiredRatio.toFixed(1)}:1)`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-semibold text-foreground">
                        {item.ratio.toFixed(2)}:1
                      </span>{" "}
                      <span
                        className={
                          item.passes
                            ? "font-semibold text-status-pass"
                            : "font-semibold text-status-warn"
                        }
                      >
                        {item.passes ? "Pass" : "Low"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {/* Script support card sourced from BASE_SUPPORTED_SCRIPTS */}
          <article className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Script safety &amp; fonts
                </h3>
                <code className="rounded border border-border bg-surface-muted px-2 py-0.5 font-mono text-xs text-muted">
                  registry/lib/scripts.ts
                </code>
              </div>

              <ul className="flex flex-col gap-2 text-xs leading-5 text-foreground-secondary">
                <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                  <span className="font-semibold text-foreground">
                    Built-in ({builtInScriptsLabel}):
                  </span>{" "}
                  Rendered out of the box using Geist (SIL OFL 1.1).
                </li>
                <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                  <span className="font-semibold text-foreground">
                    Opt-in Japanese:
                  </span>{" "}
                  Hiragana, Katakana, and JIS Kanji require installing{" "}
                  <code className="break-all font-mono text-foreground">
                    ogami/fonts/cjk/NotoSansJP-Regular.ttf
                  </code>
                  .
                </li>
                <li className="rounded-lg border border-border bg-surface-muted px-3 py-2">
                  <span className="font-semibold text-foreground">
                    Unsupported scripts:
                  </span>{" "}
                  Devanagari, Arabic, Hangul, and Simplified Chinese trigger a
                  safe fallback PNG (HTTP{" "}
                  <code className="font-mono text-foreground">200</code>,{" "}
                  <code className="font-mono text-foreground">
                    Cache-Control: no-store
                  </code>
                  ,{" "}
                  <code className="font-mono text-foreground">
                    X-Ogami-Fallback: true
                  </code>
                  ). Emoji are stripped by default (
                  <code className="font-mono text-foreground">
                    X-Ogami-Warnings
                  </code>
                  ).
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border pt-3 text-xs">
              <Link
                href="/docs/fonts"
                className="inline-flex min-h-11 min-w-11 items-center rounded-lg border border-border bg-surface-muted px-3 font-medium text-accent transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Fonts guide →
              </Link>
              <Link
                href="/docs/supported-scripts"
                className="inline-flex min-h-11 min-w-11 items-center rounded-lg border border-border bg-surface-muted px-3 font-medium text-foreground-secondary transition hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Supported scripts →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Usage Snippet */}
      <section
        aria-labelledby="usage-heading"
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="usage-heading"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            Next.js{" "}
            <code className="break-words font-mono text-lg">
              generateMetadata
            </code>{" "}
            Usage
          </h2>
          <CopyButton text={metadataSnippet} label="Copy snippet" />
        </div>
        <pre className="max-w-full overflow-x-auto rounded-xl border border-border bg-surface-muted p-4 text-xs leading-6 text-foreground">
          <code className="block overflow-x-auto font-mono">
            {metadataSnippet}
          </code>
        </pre>
      </section>
    </main>
  );
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="min-w-0 flex-1 bg-background text-foreground">
      <SiteHeader active="templates" />
      {await TemplateDetailContent({ params })}
    </div>
  );
}
