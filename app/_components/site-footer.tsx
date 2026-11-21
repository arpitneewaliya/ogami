import Link from "next/link";
import { GITHUB_REPO_URL, MIT_LICENSE_URL } from "@/site.config";

export const FOOTER_DOC_LINKS = [
  { slug: "quick-start", label: "Quick Start" },
  { slug: "writing-templates", label: "Writing Templates" },
  { slug: "satori-rules", label: "Satori Rules" },
  { slug: "fonts", label: "Fonts" },
  { slug: "supported-scripts", label: "Supported Scripts" },
  { slug: "faq", label: "FAQ" },
] as const;

const linkClassName =
  "inline-flex min-h-11 min-w-11 items-center rounded-md px-2 text-sm text-foreground-secondary transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface text-foreground-secondary">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.4fr_0.8fr]">
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 min-w-11 w-fit items-center gap-2.5 rounded-md px-2 text-base font-semibold tracking-tight text-foreground transition hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full bg-accent"
              />
              <span>Ogami</span>
            </Link>
            <p className="max-w-xs px-2 text-sm leading-6 text-muted">
              Code-first Open Graph template registry for Next.js with script
              safety, contrast audits, and static 1200×630 previews.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Toolkit
            </h2>
            <ul className="mt-1 flex flex-col">
              <li>
                <Link href="/" className={linkClassName}>
                  Templates
                </Link>
              </li>
              <li>
                <Link href="/playground" className={linkClassName}>
                  Playground
                </Link>
              </li>
              <li>
                <Link href="/docs" className={linkClassName}>
                  All Docs
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Documentation
            </h2>
            <ul className="mt-1 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              {FOOTER_DOC_LINKS.map((doc) => (
                <li key={doc.slug}>
                  <Link href={`/docs/${doc.slug}`} className={linkClassName}>
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Open Source
            </h2>
            <ul className="mt-1 flex flex-col">
              <li>
                <a
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={MIT_LICENSE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClassName}
                >
                  MIT License
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 px-2 text-xs text-muted">
          <p>
            Open-source Next.js OG toolkit · MIT License · Default Node.js{" "}
            <code className="font-mono text-foreground-secondary">next/og</code>{" "}
            runtime
          </p>
          <p className="font-mono">1200×630 · shadcn registry:item</p>
        </div>
      </div>
    </footer>
  );
}
