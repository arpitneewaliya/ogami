import Image from "next/image";
import Link from "next/link";
import { allTemplates } from "@/registry/templates";
import InstallCommand from "./_components/install-command";
import SiteHeader from "./_components/site-header";
import { getAllDocPages } from "./_lib/docs";
import {
  getTemplatePreview,
  getTemplatePreviewAlt,
} from "./_lib/template-previews";

export default function HomePage() {
  const docs = getAllDocPages();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader active="gallery" />

      <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-sky-300">
              <span>{allTemplates.length} installable Next.js OG templates</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
              Code-first Open Graph images you own.
            </h1>

            <p className="max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              A Next.js-first, code-first, installable OG template registry with
              guardrails so cards cannot look broken (including script safety),
              and ready-made developer milestone cards.
            </p>

            <div className="flex flex-col gap-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                One-line install
              </div>
              <InstallCommand itemName="github-repo" />
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/playground"
                className="rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Open Playground
              </Link>
              <Link
                href="/docs"
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Read Documentation
              </Link>
            </div>
          </div>

          {/* Demo GIF/video placeholder (launch polish asset scheduled for Phase 6) */}
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-amber-300">
                Demo Video / GIF Placeholder
              </span>
              <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                Phase 6 asset
              </span>
            </div>
            <div className="flex aspect-[16/10] w-full flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-6 text-center">
              <p className="text-sm font-medium text-zinc-200">
                Demo recording placeholder
              </p>
              <p className="mt-2 max-w-sm text-xs leading-5 text-zinc-400">
                Planned walkthrough: run{" "}
                <code className="break-words font-mono text-zinc-200">npx shadcn add</code>,
                edit parameters live in{" "}
                <Link
                  href="/playground"
                  className="text-sky-400 underline underline-offset-4 hover:text-sky-300 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                >
                  /playground
                </Link>
                , and inspect contrast &amp; platform crop overlays.
              </p>
            </div>
          </div>
        </section>

        {/* Template Gallery (static pre-rendered PNGs only; zero /api/og requests) */}
        <section id="templates" aria-labelledby="gallery-heading" className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <h2
                id="gallery-heading"
                className="text-2xl font-bold tracking-tight text-zinc-50"
              >
                Template Gallery
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Pre-rendered 1200×630 previews. Click any card for parameter
                docs, snippets, and install commands.
              </p>
            </div>
            <Link
              href="/playground"
              className="text-sm font-medium text-sky-400 hover:text-sky-300 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Try all {allTemplates.length} in Playground →
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
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 transition hover:border-zinc-600"
                >
                  <Link
                    href={`/templates/${template.id}`}
                    className="block aspect-[1200/630] w-full overflow-hidden border-b border-zinc-800 bg-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                  >
                    <Image
                      src={preview}
                      alt={getTemplatePreviewAlt(template)}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.015]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  </Link>

                  <div className="flex flex-1 flex-col justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-zinc-100">
                          <Link
                            href={`/templates/${template.id}`}
                            className="hover:text-sky-400 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                          >
                            {template.name}
                          </Link>
                        </h3>
                        <code className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                          {template.id}
                        </code>
                      </div>
                      <p className="mt-1.5 text-sm leading-5 text-zinc-400">
                        {template.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 text-xs">
                      <Link
                        href={`/templates/${template.id}`}
                        className="font-medium text-zinc-200 hover:text-sky-400 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                      >
                        Details &amp; install
                      </Link>
                      <Link
                        href={`/playground?template=${template.id}`}
                        className="font-medium text-sky-400 hover:text-sky-300 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
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

        {/* Docs Summary Links */}
        <section aria-labelledby="docs-heading" className="flex flex-col gap-6">
          <div className="flex items-end justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2
                id="docs-heading"
                className="text-2xl font-bold tracking-tight text-zinc-50"
              >
                Documentation
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Setup guides, Satori constraints, font packs, and verified script
                compatibility.
              </p>
            </div>
            <Link
              href="/docs"
              className="text-sm font-medium text-sky-400 hover:text-sky-300 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              All docs →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="flex flex-col gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition hover:border-zinc-600 hover:bg-zinc-900/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                <h3 className="text-sm font-semibold text-zinc-100">
                  {doc.frontmatter.title}
                </h3>
                <p className="text-xs leading-5 text-zinc-400">
                  {doc.frontmatter.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
