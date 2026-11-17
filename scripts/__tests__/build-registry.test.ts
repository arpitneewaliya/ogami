import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRegistryPayloads,
  REGISTRY_DEPENDENCIES,
  type RegistryCatalogPayload,
  type RegistryItemPayload,
} from "../build-registry";

describe("registry build freshness and contracts", () => {
  it("matches public/r/ exactly against a fresh build (fails if out of date)", async () => {
    const rootDir = process.cwd();
    const outDir = path.join(rootDir, "public", "r");

    const expected = await buildRegistryPayloads(rootDir);
    const actualEntries = await readdir(outDir, { withFileTypes: true });
    const actualFiles = actualEntries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    const expectedFiles = Array.from(expected.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    expect(actualFiles).toEqual(expectedFiles);

    for (const [filename, expectedContent] of expected.entries()) {
      const actualContent = await readFile(path.join(outDir, filename), "utf8");
      expect(actualContent).toBe(expectedContent);
    }
  });

  it("rewrites template ../../lib imports to @/lib/ogami/* and includes required deps and docs", async () => {
    const expected = await buildRegistryPayloads(process.cwd());
    const catalog = JSON.parse(
      expected.get("registry.json") ?? "{}",
    ) as RegistryCatalogPayload;

    expect(catalog.name).toBe("ogami");
    expect(catalog.items.map((item) => item.name)).toEqual([
      "core",
      "blog-post",
      "github-repo",
      "minimal-tech",
    ]);

    for (const templateId of ["blog-post", "github-repo", "minimal-tech"]) {
      const item = JSON.parse(
        expected.get(`${templateId}.json`) ?? "{}",
      ) as RegistryItemPayload;

      expect(item.type).toBe("registry:item");
      expect(item.dependencies).toEqual([...REGISTRY_DEPENDENCIES]);
      expect(item.files[0]?.type).toBe("registry:file");
      expect(item.files[0]?.target).toBe(`components/ogami/${templateId}.tsx`);
      expect(item.files[0]?.content).toContain("@/lib/ogami/define-template");
      expect(item.files[0]?.content).not.toContain("../../lib/");
      for (const libFile of item.files.slice(1)) {
        expect(libFile.type).toBe("registry:file");
        expect(libFile.target).toMatch(/^lib\/ogami\//);
      }

      expect(item.docs).toContain("app/api/og/route.tsx");
      expect(item.docs).toContain("outputFileTracingIncludes");
      expect(item.docs).toContain("NotoSansJP-Regular.ttf");
      expect(item.docs).toContain("Zod 4");
      expect(item.docs).toContain("Zod 3");
    }
  });
});
