import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allTemplates, templateIds } from "@/registry/templates";
import { buildRegistryPayloads } from "@/scripts/build-registry";
import { DEFAULT_SITE_URL, getSiteUrlConfig } from "@/site.config";
import { getAllDocPages, getDocBySlug } from "../docs";
import { extractMarkdownLinks } from "../markdown";
import { extractTemplateParamTable } from "../schema-table";
import {
  getTemplatePreview,
  getTemplatePreviewAlt,
  TEMPLATE_PREVIEWS,
} from "../template-previews";

describe("Phase 4b site and gallery contracts", () => {
  it("maps an explicit static preview image and descriptive alt text for every registered template", () => {
    expect(Object.keys(TEMPLATE_PREVIEWS).sort()).toEqual(
      [...templateIds].sort(),
    );

    for (const template of allTemplates) {
      const preview = getTemplatePreview(template.id);
      expect(preview).toBeDefined();

      const alt = getTemplatePreviewAlt(template);
      expect(alt).toContain(template.name);
      expect(alt).toContain(template.description);

      const rows = extractTemplateParamTable(template);
      expect(rows.length).toBeGreaterThan(0);
    }
  });

  it("includes every expected doc page, renders valid slugs, and rejects unknown slugs", async () => {
    const docs = await getAllDocPages();
    const slugs = docs.map((d) => d.slug);

    expect(slugs).toEqual([
      "quick-start",
      "writing-templates",
      "satori-rules",
      "fonts",
      "supported-scripts",
      "faq",
    ]);

    for (const doc of docs) {
      const loaded = await getDocBySlug(doc.slug);
      expect(loaded).not.toBeNull();
      expect(loaded?.frontmatter.title).toBe(doc.frontmatter.title);
      expect(loaded?.content.length).toBeGreaterThan(50);
    }

    expect(await getDocBySlug("nonexistent-page")).toBeNull();
    expect(await getDocBySlug("../secret")).toBeNull();
  });

  it("has zero broken internal links across all Markdown documentation files", async () => {
    const docs = await getAllDocPages();
    const validDocSlugs = new Set(docs.map((d) => d.slug));
    const validTemplateIds = new Set(templateIds);
    const staticRoutes = new Set(["/", "/docs", "/playground"]);

    for (const summary of docs) {
      const doc = await getDocBySlug(summary.slug);
      expect(doc).not.toBeNull();
      if (!doc) continue;

      const links = extractMarkdownLinks(doc.content);
      for (const href of links) {
        if (!href.startsWith("/")) continue;

        const pathname = href.split("?")[0]?.split("#")[0] ?? href;
        if (staticRoutes.has(pathname)) continue;

        if (pathname.startsWith("/docs/")) {
          const slug = pathname.slice("/docs/".length);
          expect(validDocSlugs.has(slug)).toBe(true);
          continue;
        }

        if (pathname.startsWith("/templates/")) {
          const id = pathname.slice("/templates/".length);
          expect(validTemplateIds.has(id)).toBe(true);
          continue;
        }

        throw new Error(
          `Broken internal link "${href}" found in content/docs/${summary.slug}.md`,
        );
      }
    }
  });

  it("keeps site URL configurable for pages while keeping registry output independent of NEXT_PUBLIC_SITE_URL", async () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      expect(getSiteUrlConfig()).toEqual({
        url: DEFAULT_SITE_URL,
        isPlaceholder: true,
      });

      process.env.NEXT_PUBLIC_SITE_URL = "https://ogami.dev/";
      expect(getSiteUrlConfig()).toEqual({
        url: "https://ogami.dev",
        isPlaceholder: false,
      });

      const payloads = await buildRegistryPayloads(process.cwd());
      const catalog = JSON.parse(payloads.get("registry.json") ?? "{}") as {
        homepage?: string;
      };
      expect(catalog.homepage).toBe(DEFAULT_SITE_URL);
    } finally {
      if (original === undefined) {
        delete process.env.NEXT_PUBLIC_SITE_URL;
      } else {
        process.env.NEXT_PUBLIC_SITE_URL = original;
      }
    }
  });

  it("keeps registry/ free of imports from app/ or site.config", async () => {
    const registryRoot = path.join(process.cwd(), "registry");
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
          files.push(full);
        }
      }
    }

    await walk(registryRoot);
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const content = await readFile(file, "utf8");
      expect(content).not.toMatch(/from\s+["']@\/app\//);
      expect(content).not.toMatch(/from\s+["'].*\/app\//);
      expect(content).not.toMatch(/site\.config/);
    }
  });
});
