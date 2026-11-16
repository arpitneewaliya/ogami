import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineTemplate } from "../define-template";
import {
  UnsupportedScriptError,
  clearFontCache,
  getCachedFontPaths,
  getJapaneseFontCmap,
  hasJapaneseFontPack,
} from "../fonts";
import { TemplateValidationError, renderTemplate } from "../render";

const japanesePackAvailable = await hasJapaneseFontPack();

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

const testTemplate = defineTemplate({
  id: "test-card",
  name: "Test Card",
  description: "Minimal test template for rendering verification.",
  params: z.object({
    title: z.string().min(1).max(80),
    author: z.string().max(50).default("Jane Doe"),
    domain: z.string().max(50).default("example.com"),
  }),
  sample: {
    title: "acme/my-project",
    author: "Jane Doe",
    domain: "example.com",
  },
  render: (p) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        backgroundColor: "#09090b",
        color: "#fafafa",
        fontFamily: "Geist",
        padding: 64,
      }}
    >
      <div style={{ display: "flex", fontSize: 56 }}>{p.title}</div>
      <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>
        {p.author} — {p.domain}
      </div>
    </div>
  ),
});

describe("renderTemplate and fallback card", () => {
  beforeAll(async () => {
    // Warm up @vercel/og's one-time Emscripten data-URI Yoga WASM initialization
    // before spying on globalThis.fetch for network-call assertions.
    const warmup = await renderTemplate(testTemplate, testTemplate.sample);
    if (warmup.ok) {
      await warmup.response.arrayBuffer();
    }
  });

  beforeEach(() => {
    clearFontCache();
  });

  it("renders a valid 1200x630 PNG for Latin and Cyrillic text without touching NotoSansJP-Regular.ttf", async () => {
    const result = await renderTemplate(testTemplate, {
      title: "acme/my-project — Привет, мир!",
      author: "Jane Doe",
      domain: "example.com",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok result");

    expect(result.isFallback).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.detectedScripts).toEqual(["latin", "cyrillic"]);

    const png = parsePngDimensions(await result.response.arrayBuffer());
    expect(png).toEqual({ isPng: true, width: 1200, height: 630 });

    // Confirm NotoSansJP-Regular.ttf was never read or cached on a Latin/Cyrillic request.
    expect(getCachedFontPaths().sort()).toEqual([
      "registry/fonts/Geist-Bold.ttf",
      "registry/fonts/Geist-Regular.ttf",
    ]);
  });

  it.skipIf(!japanesePackAvailable)(
    "renders Japanese text cleanly when NotoSansJP-Regular.ttf is installed",
    async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      try {
        const result = await renderTemplate(testTemplate, {
          title: "こんにちは世界 — 日本語テスト",
          author: "Jane Doe",
          domain: "example.com",
        });

        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error("Expected ok result");

        expect(result.isFallback).toBe(false);
        expect(result.detectedScripts).toEqual(["japanese", "latin"]);

        const png = parsePngDimensions(await result.response.arrayBuffer());
        expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
        expect(getCachedFontPaths().sort()).toEqual([
          "registry/fonts/Geist-Bold.ttf",
          "registry/fonts/Geist-Regular.ttf",
          "registry/fonts/cjk/NotoSansJP-Regular.ttf",
        ]);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
      }
    },
  );

  it.skipIf(!japanesePackAvailable)(
    "caches the parsed cmap Set for NotoSansJP-Regular.ttf across calls",
    async () => {
      const firstCmap = await getJapaneseFontCmap();
      const secondCmap = await getJapaneseFontCmap();

      expect(firstCmap).not.toBeNull();
      expect(secondCmap).toBe(firstCmap);
    },
  );

  it("returns TemplateValidationError for invalid params", async () => {
    const result = await renderTemplate(testTemplate, {
      title: "",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected validation failure");

    expect(result.error).toBeInstanceOf(TemplateValidationError);
    expect(result.error.code).toBe("INVALID_PARAMS");
  });

  it("strips emoji by default, reports warnings, and keeps Geist symbols intact", async () => {
    let renderedTitle = "";
    const spyTemplate = defineTemplate({
      ...testTemplate,
      render: (p, ctx) => {
        renderedTitle = p.title;
        return testTemplate.render(p, ctx);
      },
    });

    const result = await renderTemplate(spyTemplate, {
      title: "Launch 🚀 Star ⭐ © 2026 ☺",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok result");

    expect(result.isFallback).toBe(false);
    expect(renderedTitle).toBe("Launch Star © 2026 ☺");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.field).toBe("title");
    expect(result.warnings[0]?.removed).toEqual(["🚀", "⭐"]);

    const png = parsePngDimensions(await result.response.arrayBuffer());
    expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
  });

  it("serves the fallback card when emoji mode is set to 'fallback'", async () => {
    const result = await renderTemplate(
      testTemplate,
      { title: "Launch 🚀" },
      { emoji: "fallback", fallbackLabel: "example.com" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.isFallback) {
      throw new Error("Expected fallback result");
    }

    expect(result.response.status).toBe(200);
    expect(result.response.headers.get("cache-control")).toBe("no-store");
    expect(result.response.headers.get("x-ogami-fallback")).toBe("true");
    expect(result.response.headers.get("x-ogami-unsupported-scripts")).toBe(
      "emoji",
    );

    const png = parsePngDimensions(await result.response.arrayBuffer());
    expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
  });

  it("renders Option 1 fallback card without crashing for Devanagari and Arabic", async () => {
    for (const [text, expectedScript] of [
      ["नमस्ते दुनिया", "devanagari"],
      ["مرحبا بالعالم", "arabic"],
    ] as const) {
      const renderSpy = vi.fn(testTemplate.render);
      const guardedTemplate = defineTemplate({
        ...testTemplate,
        render: renderSpy,
      });

      const result = await renderTemplate(
        guardedTemplate,
        { title: text },
        { fallbackLabel: "example.com" },
      );

      expect(result.ok).toBe(true);
      if (!result.ok || !result.isFallback) {
        throw new Error("Expected fallback result");
      }

      // User's unsupported text must never reach the template renderer.
      expect(renderSpy).not.toHaveBeenCalled();
      expect(result.error).toBeInstanceOf(UnsupportedScriptError);
      expect(result.response.status).toBe(200);
      expect(result.response.headers.get("cache-control")).toBe("no-store");
      expect(result.response.headers.get("x-ogami-fallback")).toBe("true");
      expect(result.response.headers.get("x-ogami-unsupported-scripts")).toBe(
        expectedScript,
      );

      const png = parsePngDimensions(await result.response.arrayBuffer());
      expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
      expect(getCachedFontPaths().sort()).toEqual([
        "registry/fonts/Geist-Bold.ttf",
        "registry/fonts/Geist-Regular.ttf",
      ]);
    }
  });

  it("ignores unsafe fallbackLabel and defaults safely to template.name", async () => {
    const result = await renderTemplate(
      testTemplate,
      { title: "नमस्ते" },
      { fallbackLabel: "مرحبا بالعالم" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok || !result.isFallback) {
      throw new Error("Expected fallback result");
    }

    expect(result.response.status).toBe(200);
    const png = parsePngDimensions(await result.response.arrayBuffer());
    expect(png).toEqual({ isPng: true, width: 1200, height: 630 });
  });

  it("supports return-error and throw modes for unsupported scripts", async () => {
    const returnErrResult = await renderTemplate(
      testTemplate,
      { title: "नमस्ते" },
      { onUnsupportedScript: "return-error" },
    );
    expect(returnErrResult.ok).toBe(false);
    if (!returnErrResult.ok) {
      expect(returnErrResult.error).toBeInstanceOf(UnsupportedScriptError);
    }

    await expect(
      renderTemplate(
        testTemplate,
        { title: "مرحبا" },
        { onUnsupportedScript: "throw" },
      ),
    ).rejects.toBeInstanceOf(UnsupportedScriptError);
  });

  it("never calls fetch during template rendering, emoji stripping, emoji fallback, or script fallback", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    try {
      const normalRes = await renderTemplate(testTemplate, testTemplate.sample);
      expect(normalRes.ok).toBe(true);
      if (normalRes.ok) await normalRes.response.arrayBuffer();

      const emojiStripRes = await renderTemplate(testTemplate, {
        title: "Release 🚀 Star ⭐ Smile ☺️ Keycap 1️⃣",
      });
      expect(emojiStripRes.ok).toBe(true);
      if (emojiStripRes.ok) await emojiStripRes.response.arrayBuffer();

      const emojiFallbackRes = await renderTemplate(
        testTemplate,
        { title: "Release 🚀" },
        { emoji: "fallback" },
      );
      expect(emojiFallbackRes.ok).toBe(true);
      if (emojiFallbackRes.ok) await emojiFallbackRes.response.arrayBuffer();

      const scriptFallbackRes = await renderTemplate(testTemplate, {
        title: "مرحبا بالعالم — नमस्ते",
      });
      expect(scriptFallbackRes.ok).toBe(true);
      if (scriptFallbackRes.ok) await scriptFallbackRes.response.arrayBuffer();

      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
