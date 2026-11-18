import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  allTemplates,
  getTemplateById,
} from "@/registry/templates";
import { buildOgApiPath, extractPlaygroundFields } from "@/app/playground/schema-form";
import { z } from "zod";
import type { JsonSchemaObject } from "@/app/playground/schema-form";
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
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-12">
      {/* Breadcrumb & Heading */}
      <div className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
          <Link
            href="/"
            className="hover:text-sky-400 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Templates
          </Link>
          <span aria-hidden="true">/</span>
          <span className="font-mono text-zinc-200">{template.id}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
              {template.name}
            </h1>
            <p className="max-w-2xl text-base text-zinc-300">
              {template.description}
            </p>
            {meta.tags && meta.tags.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <Link
            href={`/playground?template=${template.id}`}
            className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Open in Playground →
          </Link>
        </div>
      </div>

      {/* Preview + Install */}
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="min-w-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <Image
            src={preview}
            alt={getTemplatePreviewAlt(template)}
            className="h-auto w-full object-contain"
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2.5 text-xs text-zinc-400">
            <span>
              Pre-rendered sample ({template.width ?? 1200}×
              {template.height ?? 630} PNG)
            </span>
            {meta.author ? <span>By {meta.author}</span> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Install Template
            </h2>
            <p className="text-xs leading-5 text-zinc-400">
              Copies{" "}
              <code className="break-words font-mono text-zinc-200">
                components/ogami/{template.id}.tsx
              </code>{" "}
              and runtime helpers into{" "}
              <code className="break-words font-mono text-zinc-200">lib/ogami/</code> (or{" "}
              <code className="break-words font-mono text-zinc-200">src/</code>). Requires{" "}
              <code className="break-words font-mono text-zinc-200">zod@^4</code>.
            </p>
            <InstallCommand itemName={template.id} />
          </div>

          <div className="flex min-w-0 flex-col gap-2 border-t border-zinc-800 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Dynamic /api/og URL
            </h2>
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
              <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-zinc-300">
                {sampleOgPath}
              </code>
              <CopyButton text={sampleOgPath} label="Copy URL" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-4 text-xs">
            <Link
              href="/docs/quick-start"
              className="font-medium text-sky-400 hover:text-sky-300 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Route setup guide →
            </Link>
            <Link
              href="/docs/supported-scripts"
              className="font-medium text-zinc-300 hover:text-zinc-100 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Supported scripts
            </Link>
          </div>
        </div>
      </section>

      {/* Parameter Table (derived from Zod schema via z.toJSONSchema) */}
      <section aria-labelledby="params-heading" className="flex min-w-0 flex-col gap-4">
        <h2 id="params-heading" className="text-xl font-bold text-zinc-100">
          Parameters
        </h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-zinc-900/90 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="border-b border-zinc-800 px-4 py-3 font-semibold">
                  Name
                </th>
                <th className="border-b border-zinc-800 px-4 py-3 font-semibold">
                  Type
                </th>
                <th className="border-b border-zinc-800 px-4 py-3 font-semibold">
                  Required
                </th>
                <th className="border-b border-zinc-800 px-4 py-3 font-semibold">
                  Max Length / Range
                </th>
                <th className="border-b border-zinc-800 px-4 py-3 font-semibold">
                  Default
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-zinc-950 text-zinc-300">
              {paramRows.map((row) => (
                <tr key={row.name}>
                  <td className="px-4 py-3 font-mono text-xs text-sky-300">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {row.type}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.required ? (
                      <span className="rounded bg-rose-500/15 px-2 py-0.5 font-medium text-rose-300">
                        Required
                      </span>
                    ) : (
                      <span className="text-zinc-400">Optional</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {row.maxLength !== undefined
                      ? `max ${row.maxLength} chars`
                      : row.minimum !== undefined || row.maximum !== undefined
                        ? `${row.minimum ?? "−∞"} .. ${row.maximum ?? "∞"}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                    {row.defaultValue ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Usage Snippet */}
      <section aria-labelledby="usage-heading" className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="usage-heading" className="text-xl font-bold text-zinc-100">
            Next.js <code className="break-words font-mono text-lg">generateMetadata</code>{" "}
            Usage
          </h2>
          <CopyButton text={metadataSnippet} label="Copy snippet" />
        </div>
        <pre className="max-w-full overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 text-xs leading-6 text-zinc-200">
          <code className="block overflow-x-auto font-mono">{metadataSnippet}</code>
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader active="templates" />
      {await TemplateDetailContent({ params })}
    </div>
  );
}
