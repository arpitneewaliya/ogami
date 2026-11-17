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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader active="docs" />

      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            Ogami Documentation
          </h1>
          <p className="max-w-2xl text-base text-zinc-300">
            Everything needed to install templates, understand script and font
            guardrails, and author new Satori-safe cards.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Core runtime install
          </div>
          <InstallCommand itemName="core" />
        </div>

        <section aria-label="Documentation pages" className="grid gap-4 sm:grid-cols-2">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="flex flex-col justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">
                  {doc.frontmatter.title}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">
                  {doc.frontmatter.description}
                </p>
              </div>
              <span className="pt-2 text-xs font-medium text-sky-400">
                Read guide →
              </span>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
