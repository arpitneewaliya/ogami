import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { assertStringFieldsHaveMaxLength } from "@/registry/lib/define-template";
import {
  clearFontCache,
  findUnsupportedScripts,
  getCachedFontPaths,
} from "@/registry/lib/fonts";
import { DEFAULT_CACHE_CONTROL } from "@/registry/lib/render";
import { allTemplates, templateIds } from "@/registry/templates";
import { GET } from "../route";

function parsePngDimensions(buffer: ArrayBuffer): {
  isPng: boolean;
  width: number;
  height: number;
} {
  const bytes = new Uint8Array(buffer);
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const isPng =
    bytes.length >= 24 && pngSig.every((value, idx) => bytes[idx] === value);
  if (!isPng) {
    return { isPng: false, width: 0, height: 0 };
  }
  const view = new DataView(buffer);
  return {
    isPng: true,
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

function makeRequest(query: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/og${query}`);
}

const EXPECTED_TEMPLATE_IDS = [
  "minimal-tech",
  "github-repo",
  "blog-post",
  "repo-launch",
  "release",
  "stars-milestone",
  "npm-downloads-milestone",
  "docs-page",
] as const;

describe("registered template contract", () => {
  it("scans registry/templates/ folders and verifies matching meta.json, valid sample data, length-capped strings, and 1200x630 previews", async () => {
    expect(templateIds.length).toBeGreaterThanOrEqual(EXPECTED_TEMPLATE_IDS.length);
    for (const coreId of EXPECTED_TEMPLATE_IDS) {
      expect(templateIds).toContain(coreId);
    }

    const templatesRoot = path.join(process.cwd(), "registry", "templates");
    const dirEntries = await readdir(templatesRoot, { withFileTypes: true });
    const folderIds = dirEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    expect(folderIds).toEqual([...templateIds].sort((a, b) => a.localeCompare(b)));

    for (const folderId of folderIds) {
      const template = allTemplates.find((entry) => entry.id === folderId);
      expect(template).toBeDefined();
      if (!template) continue;

      expect(template.id).toBe(folderId);

      expect(() =>
        assertStringFieldsHaveMaxLength(template.id, template.params),
      ).not.toThrow();

      expect(() =>
        z.toJSONSchema(template.params, {
          io: "input",
          unrepresentable: "any",
        }),
      ).not.toThrow();

      const parsed = template.params.safeParse(template.sample);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(findUnsupportedScripts(parsed.data)).toEqual([]);
      }

      const folderDir = path.join(templatesRoot, folderId);
      const metaRaw = await readFile(path.join(folderDir, "meta.json"), "utf8");
      const meta = JSON.parse(metaRaw) as {
        id: string;
        name: string;
        description: string;
        author: string;
        tags: string[];
        version: string;
      };

      expect(meta.id).toBe(folderId);
      expect(meta.name).toBe(template.name);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.author.length).toBeGreaterThan(0);
      expect(Array.isArray(meta.tags) && meta.tags.length > 0).toBe(true);
      expect(meta.version.length).toBeGreaterThan(0);

      // Verify pre-rendered preview exists and is a valid 1200x630 PNG (not byte-exact).
      const previewBuffer = await readFile(path.join(folderDir, "preview.png"));
      const previewArrayBuffer = previewBuffer.buffer.slice(
        previewBuffer.byteOffset,
        previewBuffer.byteOffset + previewBuffer.byteLength,
      );
      expect(parsePngDimensions(previewArrayBuffer)).toEqual({
        isPng: true,
        width: 1200,
        height: 630,
      });
    }
  });
});

describe("GET /api/og", () => {
  beforeAll(async () => {
    // Warm up @vercel/og's one-time Yoga WASM data-URI initialization before spying on fetch.
    const warmup = await GET(makeRequest("?template=minimal-tech"));
    await warmup.arrayBuffer();
  });

  beforeEach(() => {
    clearFontCache();
  });

  it("renders every registered template from its sample as a 1200x630 PNG with cache headers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      for (const id of templateIds) {
        const response = await GET(makeRequest(`?template=${id}`));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/png");
        expect(response.headers.get("cache-control")).toBe(
          DEFAULT_CACHE_CONTROL,
        );
        expect(response.headers.get("x-ogami-fallback")).toBeNull();

        const png = parsePngDimensions(await response.arrayBuffer());
        expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
      }
      expect(getCachedFontPaths().sort()).toEqual([
        "registry/fonts/Geist-Bold.ttf",
        "registry/fonts/Geist-Regular.ttf",
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("renders custom minimal-tech query parameters cleanly", async () => {
    const response = await GET(
      makeRequest(
        "?template=minimal-tech&title=Custom+Card+Title&subtitle=Short+subtitle&tag=BETA&domain=example.com&accentColor=%2322c55e",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(DEFAULT_CACHE_CONTROL);

    const png = parsePngDimensions(await response.arrayBuffer());
    expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
    expect(getCachedFontPaths().sort()).toEqual([
      "registry/fonts/Geist-Bold.ttf",
      "registry/fonts/Geist-Regular.ttf",
    ]);
  });

  it("renders max-length and unbroken long titles cleanly across all eight templates", async () => {
    const cases = [
      `?template=minimal-tech&title=${encodeURIComponent("W".repeat(80))}&subtitle=${encodeURIComponent("Sub ".repeat(35).trim().slice(0, 140))}&tag=${encodeURIComponent("T".repeat(30))}&domain=${encodeURIComponent("example.com")}`,
      `?template=github-repo&name=${encodeURIComponent("a".repeat(60))}&description=${encodeURIComponent("Repo ".repeat(28).trim().slice(0, 140))}&language=${encodeURIComponent("TypeScript".padEnd(24, "x").slice(0, 24))}&stars=999999999&forks=999999999`,
      `?template=blog-post&title=${encodeURIComponent("Design ".repeat(14).trim().slice(0, 100))}&author=${encodeURIComponent("Jane Doe ".repeat(6).trim().slice(0, 50))}&date=${encodeURIComponent("Nov 17, 2026")}&readTime=${encodeURIComponent("12 min read")}&category=${encodeURIComponent("Architecture".slice(0, 32))}`,
      `?template=repo-launch&repo=${encodeURIComponent("acme-org/".padEnd(60, "x"))}&tagline=${encodeURIComponent("Open ".repeat(28).trim().slice(0, 140))}&badge=${encodeURIComponent("B".repeat(24))}&language=TypeScript&license=${encodeURIComponent("Apache-2.0")}&handle=${encodeURIComponent("@" + "h".repeat(39))}`,
      `?template=release&project=${encodeURIComponent("P".repeat(48))}&version=${encodeURIComponent("v2.4.0-rc.10")}&headline=${encodeURIComponent("Release ".repeat(14).trim().slice(0, 110))}&highlight1=${encodeURIComponent("H1 ".repeat(24).trim().slice(0, 72))}&highlight2=${encodeURIComponent("H2 ".repeat(24).trim().slice(0, 72))}&date=${encodeURIComponent("Nov 17, 2026")}`,
      `?template=stars-milestone&repo=${encodeURIComponent("o".repeat(60))}&stars=${Number.MAX_SAFE_INTEGER}&format=exact&tagline=${encodeURIComponent("Thank ".repeat(20).trim().slice(0, 120))}&handle=${encodeURIComponent("@" + "u".repeat(39))}`,
      `?template=npm-downloads-milestone&packageName=${encodeURIComponent("@acme/" + "p".repeat(54))}&downloads=${Number.MAX_SAFE_INTEGER}&format=exact&period=${encodeURIComponent("Last 30 days")}&tagline=${encodeURIComponent("Built ".repeat(20).trim().slice(0, 120))}`,
      `?template=docs-page&siteName=${encodeURIComponent("S".repeat(40))}&section=${encodeURIComponent("Guides / " + "x".repeat(47))}&title=${encodeURIComponent("Docs ".repeat(18).trim().slice(0, 90))}&summary=${encodeURIComponent("Info ".repeat(32).trim().slice(0, 160))}`,
    ];

    expect(cases).toHaveLength(EXPECTED_TEMPLATE_IDS.length);

    for (const query of cases) {
      const response = await GET(makeRequest(query));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("x-ogami-fallback")).toBeNull();
      expect(parsePngDimensions(await response.arrayBuffer())).toEqual({
        isPng: true,
        width: 1200,
        height: 630,
      });
    }
  });

  it("validates milestone numeric query params (accepts 0 through MAX_SAFE_INTEGER; rejects NaN, Infinity, negative, decimal, overflow)", async () => {
    for (const valid of [
      0,
      999,
      1_000,
      1_999,
      999_999,
      1_000_000,
      Number.MAX_SAFE_INTEGER,
    ]) {
      const res = await GET(
        makeRequest(
          `?template=stars-milestone&repo=acme%2Fogami&stars=${valid}&format=compact`,
        ),
      );
      expect(res.status).toBe(200);
      expect(parsePngDimensions(await res.arrayBuffer())).toEqual({
        isPng: true,
        width: 1200,
        height: 630,
      });
    }

    for (const bad of [
      "NaN",
      "Infinity",
      "-Infinity",
      "-1",
      "1.5",
      "1.0",
      "9007199254740992",
    ]) {
      const res = await GET(
        makeRequest(
          `?template=npm-downloads-milestone&packageName=%40acme%2Fpkg&downloads=${encodeURIComponent(bad)}`,
        ),
      );
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("coerces numeric query params on github-repo and rejects non-numeric or negative values with 400", async () => {
    const validRes = await GET(
      makeRequest(
        "?template=github-repo&name=acme%2Fmy-project&description=Code-first+OG+cards&language=TypeScript&stars=1200&forks=84",
      ),
    );
    expect(validRes.status).toBe(200);
    expect(validRes.headers.get("cache-control")).toBe(DEFAULT_CACHE_CONTROL);
    expect(parsePngDimensions(await validRes.arrayBuffer())).toEqual({
      isPng: true,
      width: 1200,
      height: 630,
    });

    for (const badStars of ["abc", "-5"]) {
      const badRes = await GET(
        makeRequest(
          `?template=github-repo&name=acme%2Fmy-project&stars=${badStars}`,
        ),
      );
      expect(badRes.status).toBe(400);
      expect(badRes.headers.get("cache-control")).toBe("no-store");

      const json = (await badRes.json()) as {
        error: string;
        template: string;
        issues: Array<{ field: string; message: string }>;
      };
      expect(json.error).toBe("Invalid template parameters.");
      expect(json.template).toBe("github-repo");
      expect(json.issues.map((i) => i.field)).toContain("stars");
    }
  });

  it("renders blog-post with custom params and handles long titles with autoFit", async () => {
    const longTitle =
      "A Deep Dive Into Deterministic Layout Guardrails and Font Subsetting for Modern Static Previews";
    const validRes = await GET(
      makeRequest(
        `?template=blog-post&title=${encodeURIComponent(longTitle)}&author=Jane+Doe&date=Nov+16%2C+2026&readTime=6+min+read&category=Engineering`,
      ),
    );

    expect(validRes.status).toBe(200);
    expect(validRes.headers.get("cache-control")).toBe(DEFAULT_CACHE_CONTROL);
    expect(parsePngDimensions(await validRes.arrayBuffer())).toEqual({
      isPng: true,
      width: 1200,
      height: 630,
    });

    const missingAuthorRes = await GET(
      makeRequest("?template=blog-post&title=Hello+World"),
    );
    expect(missingAuthorRes.status).toBe(400);
    const json = (await missingAuthorRes.json()) as {
      issues: Array<{ field: string }>;
    };
    expect(json.issues.map((i) => i.field)).toContain("author");
  });

  it("strips emoji by default, exposes X-Ogami-Warnings, and makes zero network requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const response = await GET(
        makeRequest("?template=minimal-tech&title=Launch+%F0%9F%9A%80+Today"),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe(DEFAULT_CACHE_CONTROL);
      expect(response.headers.get("x-ogami-warnings")).toContain(
        "title: stripped 1 emoji (U+1F680)",
      );

      const png = parsePngDimensions(await response.arrayBuffer());
      expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("returns 400 JSON listing available templates when template param is missing", async () => {
    const response = await GET(makeRequest(""));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json = (await response.json()) as {
      error: string;
      availableTemplates: string[];
    };
    expect(json.error).toContain("Missing required query parameter");
    expect(json.availableTemplates).toEqual([...templateIds]);
  });

  it("returns 404 JSON listing available templates when template is unknown", async () => {
    const response = await GET(makeRequest("?template=nonexistent"));

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json = (await response.json()) as {
      error: string;
      availableTemplates: string[];
    };
    expect(json.error).toContain('Unknown template "nonexistent"');
    expect(json.availableTemplates).toEqual([...templateIds]);
  });

  it("returns 400 JSON with field details when params fail Zod validation", async () => {
    const response = await GET(
      makeRequest("?template=minimal-tech&title=&accentColor=invalid"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");

    const json = (await response.json()) as {
      error: string;
      template: string;
      issues: Array<{ field: string; message: string }>;
    };
    expect(json.error).toBe("Invalid template parameters.");
    expect(json.template).toBe("minimal-tech");
    expect(json.issues.map((i) => i.field)).toEqual(["title", "accentColor"]);
  });

  it("returns the Option 1 fallback card (200 image/png with no-store, never 400/500) for unsupported scripts without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const cases = [
        {
          query: `?template=minimal-tech&title=${encodeURIComponent("नमस्ते दुनिया")}`,
          expectedScript: "devanagari",
        },
        {
          query: `?template=github-repo&name=${encodeURIComponent("مرحبا بالعالم")}`,
          expectedScript: "arabic",
        },
        {
          query: `?template=blog-post&title=${encodeURIComponent("Launch 🚀")}&author=Jane+Doe&emoji=fallback`,
          expectedScript: "emoji",
        },
      ] as const;

      for (const testCase of cases) {
        const response = await GET(makeRequest(testCase.query));

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("image/png");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("cache-control")).not.toBe(
          DEFAULT_CACHE_CONTROL,
        );
        expect(response.headers.get("x-ogami-fallback")).toBe("true");
        expect(response.headers.get("x-ogami-unsupported-scripts")).toBe(
          testCase.expectedScript,
        );

        const png = parsePngDimensions(await response.arrayBuffer());
        expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
      }

      expect(getCachedFontPaths().sort()).toEqual([
        "registry/fonts/Geist-Bold.ttf",
        "registry/fonts/Geist-Regular.ttf",
      ]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
