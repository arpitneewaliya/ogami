import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
  BASE_SUPPORTED_SCRIPTS,
  UnsupportedScriptError,
  clearFontCache,
  detectScripts,
  findUnsupportedScripts,
  getCachedFontPaths,
  getJapaneseFontCmap,
  getSupportedScripts,
  hasJapaneseFontPack,
  isCodepointInGeist,
  loadFontsForScripts,
  parseTtfCmapCodepoints,
  stripEmojiFromParams,
  stripEmojiFromText,
} from "../fonts";

const japanesePackAvailable = await hasJapaneseFontPack();

describe("Geist-Regular.ttf cmap verification", () => {
  it("matches the binary cmap of registry/fonts/Geist-Regular.ttf exactly across all BMP codepoints", async () => {
    const filePath = path.join(
      process.cwd(),
      "registry/fonts/Geist-Regular.ttf",
    );
    const buffer = await readFile(filePath);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const realCmap = parseTtfCmapCodepoints(arrayBuffer);

    expect(buffer.byteLength).toBe(125_956);
    expect(realCmap.size).toBe(726);

    for (let cp = 0; cp <= 0xffff; cp++) {
      expect(isCodepointInGeist(cp)).toBe(realCmap.has(cp));
    }
  });
});

describe("script detection", () => {
  it("recognizes Latin, Latin-1, covered Latin Extended, Vietnamese, and Cyrillic as supported", () => {
    expect(detectScripts("Hello, Ogami! 123")).toEqual(["latin"]);
    expect(detectScripts("Café résumé naïve über Straße")).toEqual(["latin"]);
    expect(detectScripts("Łódź, Žižkov, București, Nguyễn")).toEqual([
      "latin",
    ]);
    expect(detectScripts("Привет, мир! Україна 2026")).toEqual([
      "cyrillic",
    ]);
    expect(detectScripts("Ogami — Привет")).toEqual(["latin", "cyrillic"]);

    const issues = findUnsupportedScripts({
      title: "Привет, мир! — Łódź & Nguyễn",
      subtitle: "Built for Next.js 16",
    });
    expect(issues).toEqual([]);
  });

  it("ignores digits, punctuation, currency, arrows, and Geist-covered text symbols", () => {
    const text = "v1.0 • $100 → €90 / ₹500 • №1 © ® ™ ☺ ☹ (100%)";
    expect(detectScripts(text)).toEqual(["latin"]);
    expect(findUnsupportedScripts({ text })).toEqual([]);
  });

  it("flags uncovered Latin Extended-B, Cyrillic Supplement, and Greek characters", () => {
    expect(detectScripts("Latin Ȁ")).toEqual(["latin", "latin-extended"]);
    expect(detectScripts("Привет Ԁ")).toEqual([
      "cyrillic",
      "cyrillic-extended",
    ]);
    expect(detectScripts("Ελληνικά")).toEqual(["greek"]);

    const issues = findUnsupportedScripts({
      latinExt: "Ȁ",
      cyrExt: "Ԁ",
      greekWord: "Ελληνικά",
      greekMath: "π ≈ 3.14",
    });

    expect(issues.map((i) => [i.field, i.script])).toEqual([
      ["latinExt", "latin-extended"],
      ["cyrExt", "cyrillic-extended"],
      ["greekWord", "greek"],
      ["greekMath", "greek"],
    ]);
  });

  it("distinguishes Japanese from Korean Hangul and Simplified Chinese", () => {
    expect(detectScripts("こんにちは世界 — 日本語フォント")).toEqual([
      "japanese",
    ]);
    expect(detectScripts("안녕하세요 세계")).toEqual(["hangul"]);
    expect(detectScripts("你好世界，这是一个测试")).toEqual([
      "japanese",
      "chinese",
    ]);

    const withoutJpPack = findUnsupportedScripts(
      {
        ja: "こんにちは世界",
        ko: "안녕하세요",
        zh: "这测试简",
      },
      { supportedScripts: BASE_SUPPORTED_SCRIPTS },
    );
    expect(withoutJpPack.map((i) => [i.field, i.script])).toEqual([
      ["ja", "japanese"],
      ["ko", "hangul"],
      ["zh", "chinese"],
    ]);
  });

  it("flags Devanagari, Arabic, Hebrew, and Thai as unsupported with descriptive reasons", () => {
    const issues = findUnsupportedScripts({
      hi: "नमस्ते दुनिया",
      ar: "مرحبا بالعالم",
      he: "שלום עולם",
      th: "สวัสดีชาวโลก",
    });

    expect(issues.map((i) => [i.field, i.script])).toEqual([
      ["hi", "devanagari"],
      ["ar", "arabic"],
      ["he", "hebrew"],
      ["th", "thai"],
    ]);
    for (const issue of issues) {
      expect(issue.reason.length).toBeGreaterThan(10);
    }
  });

  it("treats emoji and VS16/keycap sequences as unsupported so no CDN requests occur at render time", () => {
    const samples = [
      "Launch 🚀",
      "Stars ⭐",
      "Heart ❤",
      "Heart VS16 ❤️",
      "Smile VS16 ☺️",
      "Trademark VS16 ™️",
      "Keycap 1️⃣",
      "Flag 🇺🇸",
    ];

    for (const sample of samples) {
      expect(detectScripts(sample)).toContain("emoji");
      const issues = findUnsupportedScripts({ title: sample });
      expect(issues.some((i) => i.script === "emoji")).toBe(true);
    }
  });
});

describe("font loader and caching", () => {
  beforeEach(() => {
    clearFontCache();
  });

  it("loads Geist-Regular.ttf from disk and caches its ArrayBuffer in memory", async () => {
    const first = await loadFontsForScripts(["latin", "cyrillic"]);
    const second = await loadFontsForScripts(["latin"]);

    expect(first).toHaveLength(1);
    expect(first[0]?.name).toBe("Geist");
    expect(first[0]?.weight).toBe(400);
    expect(first[0]?.style).toBe("normal");
    expect(first[0]?.data.byteLength).toBe(125_956);
    expect(second[0]?.data).toBe(first[0]?.data);
    expect(getCachedFontPaths()).toEqual(["registry/fonts/Geist-Regular.ttf"]);
  });

  it("strips emoji graphemes while keeping Geist-covered symbols intact", () => {
    expect(stripEmojiFromText("Launch 🚀 Star ⭐ © ® ™ ☺")).toEqual({
      cleaned: "Launch Star © ® ™ ☺",
      removed: ["🚀", "⭐"],
    });

    const { sanitized, warnings } = stripEmojiFromParams({
      title: "Hello ☺️ 1️⃣",
      subtitle: "Built by Jane Doe © 2026",
    });

    expect(sanitized).toEqual({
      title: "Hello",
      subtitle: "Built by Jane Doe © 2026",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.field).toBe("title");
    expect(warnings[0]?.removed).toEqual(["☺️", "1️⃣"]);
  });

  it.skipIf(!japanesePackAvailable)(
    "loads optional NotoSansJP-Regular.ttf when installed and checks exact Kanji coverage",
    async () => {
      const supported = await getSupportedScripts();
      expect(supported).toEqual(["latin", "cyrillic", "japanese"]);

      const fonts = await loadFontsForScripts(["latin", "japanese"]);
      expect(fonts).toHaveLength(2);
      expect(fonts[1]?.name).toBe("Noto Sans JP");
      expect(fonts[1]?.data.byteLength).toBe(5_703_580);

      const japaneseCmap = await getJapaneseFontCmap();
      expect(japaneseCmap).not.toBeNull();
      expect(japaneseCmap?.size).toBe(16_732);

      // Japanese renders with no issues when pack is installed
      const jaIssues = findUnsupportedScripts(
        { title: "こんにちは世界 — 日本語フォント" },
        { supportedScripts: supported, japaneseCmap: japaneseCmap ?? undefined },
      );
      expect(jaIssues).toEqual([]);

      // Simplified Chinese characters missing from NotoSansJP are caught via real cmap
      const zhIssues = findUnsupportedScripts(
        { title: "欢迎使用简体中文测试" },
        { supportedScripts: supported, japaneseCmap: japaneseCmap ?? undefined },
      );
      expect(zhIssues.map((i) => i.script)).toContain("chinese");
    },
  );

  it("throws UnsupportedScriptError if Japanese is requested when font pack is unavailable", async () => {
    if (japanesePackAvailable) {
      expect(await getSupportedScripts()).toContain("japanese");
      return;
    }

    await expect(loadFontsForScripts(["japanese"])).rejects.toBeInstanceOf(
      UnsupportedScriptError,
    );
  });
});
