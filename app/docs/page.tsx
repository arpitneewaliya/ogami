import type { Metadata } from "next";
import Link from "next/link";
import InstallCommand from "@/app/_components/install-command";
import SiteHeader from "@/app/_components/site-header";
import { getAllDocPages } from "@/app/_lib/docs";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Quick start, writing templates, Satori rules, fonts, script safety, and FAQ for Ogami.",
};

export default function DocsIndexPage() {
  const docs = getAllDocPages();

  return (
    <div className="min-w-0 flex-1 bg-background text-foreground">
      <SiteHeader active="docs" />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Ogami Documentation
          </h1>
          <p className="max-w-2xl text-base leading-7 text-foreground-secondary">
            Everything needed to install templates, understand script and font
            guardrails, and author new Satori-safe cards.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Core runtime install
          </div>
          <InstallCommand itemName="core" />
        </div>

        <section
          aria-label="Documentation pages"
          className="grid gap-4 sm:grid-cols-2"
        >
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="flex min-h-11 min-w-11 flex-col justify-between gap-2 rounded-xl border border-border bg-surface p-5 transition hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {doc.frontmatter.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-foreground-secondary">
                  {doc.frontmatter.description}
                </p>
              </div>
              <span className="pt-2 text-xs font-semibold text-accent">
                Read guide →
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
