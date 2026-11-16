import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("registered template contract", () => {
  it("verifies all registered templates have matching meta.json, valid sample data, and length-capped strings", async () => {
    expect(templateIds).toEqual(["minimal-tech", "github-repo", "blog-post"]);

    for (const template of allTemplates) {
      expect(() =>
        assertStringFieldsHaveMaxLength(template.id, template.params),
      ).not.toThrow();

      const parsed = template.params.safeParse(template.sample);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(findUnsupportedScripts(parsed.data)).toEqual([]);
      }

      const metaPath = path.join(
        process.cwd(),
        "registry",
        "templates",
        template.id,
        "meta.json",
      );
      const metaRaw = await readFile(metaPath, "utf8");
      const meta = JSON.parse(metaRaw) as {
        id: string;
        name: string;
        description: string;
        author: string;
        tags: string[];
        version: string;
      };

      expect(meta.id).toBe(template.id);
      expect(meta.name).toBe(template.name);
      expect(meta.description.length).toBeGreaterThan(0);
      expect(meta.author.length).toBeGreaterThan(0);
      expect(Array.isArray(meta.tags) && meta.tags.length > 0).toBe(true);
      expect(meta.version.length).toBeGreaterThan(0);
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

  it("renders max-length and unbroken long titles cleanly across all three templates", async () => {
    const cases = [
      `?template=minimal-tech&title=${encodeURIComponent("W".repeat(80))}`,
      `?template=github-repo&name=${encodeURIComponent("a".repeat(60))}`,
      `?template=blog-post&title=${encodeURIComponent("Design ".repeat(14).trim().slice(0, 100))}&author=Jane+Doe`,
    ];

    for (const query of cases) {
      const response = await GET(makeRequest(query));
      expect(response.status).toBe(200);
      expect(parsePngDimensions(await response.arrayBuffer())).toEqual({
        isPng: true,
        width: 1200,
        height: 630,
      });
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
    expect(json.availableTemplates).toEqual([
      "minimal-tech",
      "github-repo",
      "blog-post",
    ]);
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
    expect(json.availableTemplates).toEqual([
      "minimal-tech",
      "github-repo",
      "blog-post",
    ]);
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

  it("returns the Option 1 fallback card (never 500) for unsupported scripts without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const response = await GET(
        makeRequest(
          `?template=minimal-tech&title=${encodeURIComponent("नमस्ते दुनिया")}`,
        ),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-ogami-fallback")).toBe("true");
      expect(response.headers.get("x-ogami-unsupported-scripts")).toBe(
        "devanagari",
      );

      const png = parsePngDimensions(await response.arrayBuffer());
      expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
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
