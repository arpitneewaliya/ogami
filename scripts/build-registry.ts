import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REGISTRY_ITEM_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry-item.json";
export const REGISTRY_CATALOG_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry.json";

export const REGISTRY_DEPENDENCIES = ["zod@^4.0.0", "geist@^1.9.2"] as const;

const NOTO_SANS_JP_URL =
  "https://fonts.gstatic.com/s/notosansjp/v57/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFBEj75vY1Lw_.ttf";

const CORE_LIB_FILES = [
  {
    sourceRelPath: "registry/lib/auto-fit.ts",
    target: "@lib/ogami/auto-fit.ts",
  },
  {
    sourceRelPath: "registry/lib/define-template.ts",
    target: "@lib/ogami/define-template.ts",
  },
  {
    sourceRelPath: "registry/lib/fonts.ts",
    target: "@lib/ogami/fonts.ts",
  },
  {
    sourceRelPath: "registry/lib/render.tsx",
    target: "@lib/ogami/render.tsx",
  },
] as const;

export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  version: string;
}

export interface RegistryItemFile {
  path: string;
  type: "registry:lib" | "registry:component";
  target: string;
  content?: string;
}

export interface RegistryItemPayload {
  $schema: string;
  name: string;
  type: "registry:lib" | "registry:block";
  title: string;
  description: string;
  author?: string;
  dependencies: string[];
  files: RegistryItemFile[];
  categories?: string[];
  meta?: Record<string, string>;
  docs: string;
}

export interface RegistryCatalogPayload {
  $schema: string;
  name: string;
  homepage: string;
  items: Array<Omit<RegistryItemPayload, "$schema" | "docs">>;
}

function toCamelCase(kebab: string): string {
  return kebab.replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());
}

/**
 * Rewrites template imports from `../../lib/<name>` to `@/lib/ogami/<name>`
 * so the shadcn CLI rewrites `@/lib/...` to the consumer project's `aliases.lib`.
 */
export function rewriteTemplateLibImports(source: string): string {
  return source.replace(
    /from\s+(["'])\.\.\/\.\.\/lib\/([^"']+)\1/g,
    (_match, quote: string, subpath: string) =>
      `from ${quote}@/lib/ogami/${subpath}${quote}`,
  );
}

function buildSharedDocsFooter(): string {
  return [
    "### Vercel serverless font tracing (`next.config.ts`)",
    "",
    "```ts",
    'import type { NextConfig } from "next";',
    "",
    "const nextConfig: NextConfig = {",
    "  outputFileTracingIncludes: {",
    '    "/api/og": [',
    '      "./node_modules/geist/dist/fonts/geist-sans/*.ttf",',
    '      "./ogami/fonts/cjk/*.ttf",',
    "    ],",
    "  },",
    "};",
    "",
    "export default nextConfig;",
    "```",
    "",
    "### Optional Japanese font pack (Noto Sans JP, SIL OFL 1.1)",
    "",
    "Latin and Cyrillic work out of the box via `geist`. To enable Japanese (Hiragana, Katakana, JIS Kanji), download `NotoSansJP-Regular.ttf` (~5.7 MB) into `ogami/fonts/cjk/NotoSansJP-Regular.ttf`:",
    "",
    "```bash",
    "mkdir -p ogami/fonts/cjk",
    `curl -L "${NOTO_SANS_JP_URL}" -o ogami/fonts/cjk/NotoSansJP-Regular.ttf`,
    "```",
    "",
    "### Requirements",
    "",
    "- **Zod 4 (`zod@^4.0.0`)** is required by `@/lib/ogami/define-template` and `@/lib/ogami/render`.",
    "- Do **not** add `export const runtime = ...` to `app/api/og/route.tsx` if your app uses Next.js `cacheComponents`.",
  ].join("\n");
}

export function buildRouteSnippet(templateId: string): string {
  const varName = `${toCamelCase(templateId)}Template`;
  return [
    "### Add `app/api/og/route.tsx`",
    "",
    "```tsx",
    'import type { NextRequest } from "next/server";',
    `import ${varName} from "@/components/ogami/${templateId}";`,
    "import {",
    "  extractTemplateParamsFromSearchParams,",
    "  type RegisteredTemplate,",
    '} from "@/lib/ogami/define-template";',
    'import { TemplateValidationError, renderTemplate } from "@/lib/ogami/render";',
    "",
    "const templates: Record<string, RegisteredTemplate> = {",
    `  [${varName}.id]: ${varName},`,
    "};",
    "",
    "export async function GET(request: NextRequest): Promise<Response> {",
    "  const searchParams = request.nextUrl.searchParams;",
    `  const templateId = searchParams.get("template")?.trim() || ${varName}.id;`,
    "  const template = templates[templateId];",
    "",
    "  if (!template) {",
    "    return Response.json(",
    "      {",
    "        error: `Unknown template \"${templateId}\".`,",
    "        availableTemplates: Object.keys(templates),",
    "      },",
    '      { status: 404, headers: { "cache-control": "no-store" } },',
    "    );",
    "  }",
    "",
    "  const rawParams = extractTemplateParamsFromSearchParams(searchParams, template);",
    "  const result = await renderTemplate(template, rawParams);",
    "",
    "  if (!result.ok) {",
    "    if (result.error instanceof TemplateValidationError) {",
    "      return Response.json(",
    '        { error: "Invalid template parameters.", issues: result.error.issues },',
    '        { status: 400, headers: { "cache-control": "no-store" } },',
    "      );",
    "    }",
    "    return Response.json(",
    "      { error: result.error.message },",
    '      { status: 400, headers: { "cache-control": "no-store" } },',
    "    );",
    "  }",
    "",
    "  return result.response;",
    "}",
    "```",
    "",
    `Test locally at \`/api/og?template=${templateId}\` (returns a 1200x630 PNG).`,
  ].join("\n");
}

function buildTemplateDocs(templateId: string): string {
  return `${buildRouteSnippet(templateId)}\n\n${buildSharedDocsFooter()}`;
}

function buildCoreDocs(): string {
  return [
    "### Ogami Core Runtime",
    "",
    "Install any Ogami template item (or create your own template using `defineTemplate` from `@/lib/ogami/define-template` and render it with `renderTemplate` from `@/lib/ogami/render`).",
    "",
    buildSharedDocsFooter(),
  ].join("\n");
}

function parseTemplateMeta(rawJson: string, folderName: string): TemplateMeta {
  const parsed = JSON.parse(rawJson) as Partial<TemplateMeta>;
  if (
    typeof parsed.id !== "string" ||
    parsed.id !== folderName ||
    typeof parsed.name !== "string" ||
    typeof parsed.description !== "string" ||
    typeof parsed.author !== "string" ||
    !Array.isArray(parsed.tags) ||
    parsed.tags.some((t) => typeof t !== "string") ||
    typeof parsed.version !== "string"
  ) {
    throw new Error(
      `Invalid meta.json in registry/templates/${folderName}: expected id="${folderName}", name, description, author, tags[], and version.`,
    );
  }
  return {
    id: parsed.id,
    name: parsed.name,
    description: parsed.description,
    author: parsed.author,
    tags: parsed.tags,
    version: parsed.version,
  };
}

function stripFileContents(files: readonly RegistryItemFile[]): RegistryItemFile[] {
  return files.map(({ path: filePath, type, target }) => ({
    path: filePath,
    type,
    target,
  }));
}

/**
 * Reads `registry/` and returns deterministic JSON file payloads keyed by
 * output filename (e.g. `core.json`, `github-repo.json`, `registry.json`).
 */
export async function buildRegistryPayloads(
  rootDir = process.cwd(),
): Promise<Map<string, string>> {
  const coreLibFiles: RegistryItemFile[] = await Promise.all(
    CORE_LIB_FILES.map(async (entry) => {
      const content = await readFile(
        path.join(rootDir, entry.sourceRelPath),
        "utf8",
      );
      return {
        path: entry.sourceRelPath,
        type: "registry:lib",
        target: entry.target,
        content,
      };
    }),
  );

  const coreItem: RegistryItemPayload = {
    $schema: REGISTRY_ITEM_SCHEMA_URL,
    name: "core",
    type: "registry:lib",
    title: "Ogami Core Runtime",
    description:
      "Core template contract, next/og renderer, script-safe font loader, and autoFit helper for Ogami.",
    dependencies: [...REGISTRY_DEPENDENCIES],
    files: coreLibFiles,
    docs: buildCoreDocs(),
  };

  const templatesDir = path.join(rootDir, "registry", "templates");
  const dirEntries = await readdir(templatesDir, { withFileTypes: true });
  const templateFolders = dirEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const templateItems: RegistryItemPayload[] = [];

  for (const folder of templateFolders) {
    const metaPath = path.join(templatesDir, folder, "meta.json");
    const templatePath = path.join(templatesDir, folder, "template.tsx");

    const [rawMeta, rawTemplate] = await Promise.all([
      readFile(metaPath, "utf8"),
      readFile(templatePath, "utf8"),
    ]);

    const meta = parseTemplateMeta(rawMeta, folder);
    const rewrittenTemplate = rewriteTemplateLibImports(rawTemplate);

    const templateFile: RegistryItemFile = {
      path: `registry/templates/${folder}/template.tsx`,
      type: "registry:component",
      target: `@components/ogami/${folder}.tsx`,
      content: rewrittenTemplate,
    };

    templateItems.push({
      $schema: REGISTRY_ITEM_SCHEMA_URL,
      name: meta.id,
      type: "registry:block",
      title: meta.name,
      description: meta.description,
      author: meta.author,
      dependencies: [...REGISTRY_DEPENDENCIES],
      files: [templateFile, ...coreLibFiles],
      categories: meta.tags,
      meta: {
        version: meta.version,
      },
      docs: buildTemplateDocs(meta.id),
    });
  }

  const allItems = [coreItem, ...templateItems];

  const catalog: RegistryCatalogPayload = {
    $schema: REGISTRY_CATALOG_SCHEMA_URL,
    name: "ogami",
    homepage: "http://localhost:3000",
    items: allItems.map((item) => ({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      ...(item.author ? { author: item.author } : {}),
      dependencies: item.dependencies,
      ...(item.categories ? { categories: item.categories } : {}),
      ...(item.meta ? { meta: item.meta } : {}),
      files: stripFileContents(item.files),
    })),
  };

  const outputs = new Map<string, string>();
  for (const item of allItems) {
    outputs.set(`${item.name}.json`, `${JSON.stringify(item, null, 2)}\n`);
  }
  outputs.set("registry.json", `${JSON.stringify(catalog, null, 2)}\n`);

  return outputs;
}

export async function writeRegistry(rootDir = process.cwd()): Promise<string[]> {
  const outDir = path.join(rootDir, "public", "r");
  await mkdir(outDir, { recursive: true });

  const expected = await buildRegistryPayloads(rootDir);
  const existing = await readdir(outDir, { withFileTypes: true });

  for (const entry of existing) {
    if (entry.isFile() && entry.name.endsWith(".json") && !expected.has(entry.name)) {
      await rm(path.join(outDir, entry.name));
    }
  }

  const written: string[] = [];
  for (const [filename, content] of expected.entries()) {
    await writeFile(path.join(outDir, filename), content, "utf8");
    written.push(filename);
  }

  return written.sort((a, b) => a.localeCompare(b));
}

const isCliEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  const written = await writeRegistry();
  console.log(`Generated ${written.length} registry files in public/r/: ${written.join(", ")}`);
}
