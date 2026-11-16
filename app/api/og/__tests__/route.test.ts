import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearFontCache, getCachedFontPaths } from "@/registry/lib/fonts";
import { DEFAULT_CACHE_CONTROL } from "@/registry/lib/render";
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

describe("GET /api/og", () => {
  beforeAll(async () => {
    // Warm up @vercel/og's one-time Yoga WASM data-URI initialization before spying on fetch.
    const warmup = await GET(makeRequest("?template=minimal-tech"));
    await warmup.arrayBuffer();
  });

  beforeEach(() => {
    clearFontCache();
  });

  it("renders minimal-tech sample as a 1200x630 PNG with cache headers and without loading NotoSansJP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const response = await GET(makeRequest("?template=minimal-tech"));

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("image/png");
      expect(response.headers.get("cache-control")).toBe(DEFAULT_CACHE_CONTROL);
      expect(response.headers.get("x-ogami-fallback")).toBeNull();

      const png = parsePngDimensions(await response.arrayBuffer());
      expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
      expect(getCachedFontPaths()).toEqual(["registry/fonts/Geist-Regular.ttf"]);
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
    expect(getCachedFontPaths()).toEqual(["registry/fonts/Geist-Regular.ttf"]);
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
    expect(json.availableTemplates).toEqual(["minimal-tech"]);
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
    expect(json.availableTemplates).toEqual(["minimal-tech"]);
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
      expect(getCachedFontPaths()).toEqual(["registry/fonts/Geist-Regular.ttf"]);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
