import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/app/_components/site-header";
import { getAllDocPages, getDocBySlug } from "@/app/_lib/docs";
import { MarkdownArticle } from "@/app/_lib/markdown";
import { getSiteUrlConfig } from "@/site.config";

export function generateStaticParams(): Array<{ slug: string }> {
  const docs = getAllDocPages();
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await getDocBySlug(slug);
  if (!doc) {
    return {
      title: "Doc Not Found",
    };
  }
  return {
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
  };
}

async function DocArticleContent({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  const allDocs = getAllDocPages();

  if (!doc) {
    notFound();
  }

  const currentIdx = allDocs.findIndex((item) => item.slug === doc.slug);
  const prevDoc = currentIdx > 0 ? allDocs[currentIdx - 1] : null;
  const nextDoc =
    currentIdx >= 0 && currentIdx < allDocs.length - 1
      ? allDocs[currentIdx + 1]
      : null;

  const { url, isPlaceholder } = getSiteUrlConfig();

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[240px_1fr] lg:gap-10">
      <aside
        aria-label="Documentation sidebar"
        className="min-w-0 lg:sticky lg:top-8 lg:self-start"
      >
        {/* Mobile collapsed disclosure (<1024px) so article H1 stays above the fold */}
        <details className="group rounded-xl border border-border bg-surface lg:hidden">
          <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            <span className="truncate">
              Docs menu · {doc.frontmatter.title}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </summary>

          <nav
            aria-label="Mobile documentation pages"
            className="border-t border-border p-2"
          >
            <ul className="flex flex-col gap-1">
              <li>
                <Link
                  href="/docs"
                  className="inline-flex min-h-11 min-w-11 w-full items-center rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  All Documentation
                </Link>
              </li>
              {allDocs.map((item) => {
                const active = item.slug === doc.slug;
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/docs/${item.slug}`}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 min-w-11 w-full items-center rounded-lg px-3 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        active
                          ? "bg-accent-subtle font-semibold text-accent"
                          : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                      }`}
                    >
                      {item.frontmatter.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </details>

        {/* Desktop sidebar (>=1024px) */}
        <nav
          aria-label="Documentation pages"
          className="hidden rounded-xl border border-border bg-surface p-3 lg:block"
        >
          <Link
            href="/docs"
            className="inline-flex min-h-11 min-w-11 w-full items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Documentation
          </Link>
          <ul className="mt-1 flex flex-col gap-1">
            {allDocs.map((item) => {
              const active = item.slug === doc.slug;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 min-w-11 w-full items-center rounded-lg px-3 py-2 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      active
                        ? "bg-accent-subtle font-semibold text-accent"
                        : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
                    }`}
                  >
                    {item.frontmatter.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <article className="min-w-0">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {doc.frontmatter.title}
          </h1>
          <p className="mt-2 text-base leading-7 text-foreground-secondary">
            {doc.frontmatter.description}
          </p>

          {isPlaceholder ? (
            <p className="mt-4 break-words rounded-xl border border-status-warn-border bg-status-warn-subtle/40 px-3.5 py-2.5 text-xs leading-5 text-status-warn">
              Install commands on this page use the placeholder URL{" "}
              <code className="break-all font-mono">{url}</code> — set{" "}
              <code className="break-words font-mono">
                NEXT_PUBLIC_SITE_URL
              </code>{" "}
              for your deployment domain.
            </p>
          ) : null}
        </header>

        <MarkdownArticle source={doc.content} />

        <nav
          aria-label="Adjacent documentation pages"
          className="mt-12 grid gap-4 border-t border-border pt-6 sm:grid-cols-2"
        >
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              className="flex min-h-11 min-w-11 flex-col justify-center rounded-xl border border-border bg-surface p-4 text-left transition hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="text-xs text-muted">← Previous</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {prevDoc.frontmatter.title}
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              className="flex min-h-11 min-w-11 flex-col justify-center rounded-xl border border-border bg-surface p-4 text-right transition hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="text-xs text-muted">Next →</div>
              <div className="mt-1 text-sm font-semibold text-foreground">
                {nextDoc.frontmatter.title}
              </div>
            </Link>
          ) : null}
        </nav>
      </article>
    </main>
  );
}

export default async function DocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="min-w-0 flex-1 bg-background text-foreground">
      <SiteHeader active="docs" />
      {await DocArticleContent({ params })}
    </div>
  );
}
