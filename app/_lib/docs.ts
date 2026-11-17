import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getSiteUrlConfig } from "@/site.config";
import { parseDocFrontmatter, type DocFrontmatter } from "./markdown";

export interface DocPageSummary {
  slug: string;
  frontmatter: DocFrontmatter;
}

export interface DocPageData extends DocPageSummary {
  content: string;
}

const DOCS_DIR = path.join(process.cwd(), "content", "docs");

function applySitePlaceholders(markdown: string, siteUrl: string): string {
  return markdown.replaceAll("{{SITE_URL}}", siteUrl);
}

/**
 * Lists every Markdown documentation page in `content/docs/` sorted by frontmatter `order`.
 */
export function getAllDocPages(): DocPageSummary[] {
  const entries = readdirSync(DOCS_DIR, { withFileTypes: true });
  const mdFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name);

  const docs = mdFiles.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const raw = readFileSync(path.join(DOCS_DIR, filename), "utf8");
    const parsed = parseDocFrontmatter(raw, slug);
    return {
      slug,
      frontmatter: parsed.frontmatter,
    };
  });

  return docs.sort((a, b) => a.frontmatter.order - b.frontmatter.order);
}

/**
 * Loads raw Markdown body & frontmatter for a single doc slug, returning `null` if unknown.
 */
export function getDocBySlug(slug: string): DocPageData | null {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }

  const filePath = path.join(DOCS_DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf8");
  } catch {
    return null;
  }

  const parsed = parseDocFrontmatter(raw, slug);
  const { url } = getSiteUrlConfig();

  return {
    slug,
    frontmatter: parsed.frontmatter,
    content: applySitePlaceholders(parsed.body, url),
  };
}
