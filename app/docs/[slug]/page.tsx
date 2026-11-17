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
    <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Documentation sidebar" className="lg:sticky lg:top-8 lg:self-start">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <Link
            href="/docs"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Documentation
          </Link>
          <ul className="mt-3 flex flex-col gap-1">
            {allDocs.map((item) => {
              const active = item.slug === doc.slug;
              return (
                <li key={item.slug}>
                  <Link
                    href={`/docs/${item.slug}`}
                    className={`block rounded-md px-3 py-1.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                      active
                        ? "bg-sky-500/15 font-medium text-sky-300"
                        : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
                    }`}
                  >
                    {item.frontmatter.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <article className="min-w-0">
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            {doc.frontmatter.title}
          </h1>
          <p className="mt-2 text-base text-zinc-300">
            {doc.frontmatter.description}
          </p>

          {isPlaceholder ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
              Install commands on this page use the placeholder URL{" "}
              <code className="font-mono">{url}</code> — set{" "}
              <code className="font-mono">NEXT_PUBLIC_SITE_URL</code> for your
              deployment domain.
            </p>
          ) : null}
        </header>

        <MarkdownArticle source={doc.content} />

        <nav
          aria-label="Adjacent documentation pages"
          className="mt-12 grid gap-4 border-t border-zinc-800 pt-6 sm:grid-cols-2"
        >
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-left transition hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <div className="text-xs text-zinc-400">← Previous</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
                {prevDoc.frontmatter.title}
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-right transition hover:border-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <div className="text-xs text-zinc-400">Next →</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader active="docs" />
      {await DocArticleContent({ params })}
    </div>
  );
}
