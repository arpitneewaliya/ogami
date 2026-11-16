import { access, readFile } from "node:fs/promises";
import path from "node:path";

export type SupportedScript = "latin" | "cyrillic" | "japanese";

export type UnsupportedScript =
  | "latin-extended"
  | "cyrillic-extended"
  | "greek"
  | "chinese"
  | "hangul"
  | "devanagari"
  | "arabic"
  | "hebrew"
  | "thai"
  | "indic-other"
  | "southeast-asian"
  | "emoji"
  | "other";

export type ScriptId = SupportedScript | UnsupportedScript;

/**
 * Scripts supported out of the box by the bundled default font (Geist-Regular.ttf).
 */
export const BASE_SUPPORTED_SCRIPTS: readonly SupportedScript[] = [
  "latin",
  "cyrillic",
] as const;

export const supportedScripts = BASE_SUPPORTED_SCRIPTS;

export interface LoadedFont {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
}

export interface UnsupportedScriptIssue {
  field: string;
  script: ScriptId;
  reason: string;
  sampleChar: string;
}

export interface EmojiWarning {
  field: string;
  removed: string[];
  reason: string;
}

export class UnsupportedScriptError extends Error {
  readonly code = "UNSUPPORTED_SCRIPT" as const;
  readonly issues: readonly UnsupportedScriptIssue[];
  readonly scripts: readonly ScriptId[];

  constructor(issues: readonly UnsupportedScriptIssue[]) {
    const uniqueScripts = Array.from(new Set(issues.map((i) => i.script)));
    const summary = issues
      .map((i) => `${i.field}: ${i.script} (${i.reason})`)
      .join("; ");
    super(`Unsupported script detected: ${summary}`);
    this.name = "UnsupportedScriptError";
    this.issues = issues;
    this.scripts = uniqueScripts;
  }
}

/**
 * Exact codepoint ranges mapped in the bundled Geist-Regular.ttf (v1.800, 726 glyphs).
 * Keeping this table synced with the font binary lets script detection run
 * synchronously and guarantees zero runtime Google Fonts fallback fetches.
 */
export const GEIST_COVERED_RANGES: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e],
  [0x00a0, 0x00ac],
  [0x00ae, 0x0113],
  [0x0116, 0x012b],
  [0x012e, 0x0137],
  [0x0139, 0x013e],
  [0x0141, 0x0148],
  [0x014a, 0x014d],
  [0x0150, 0x017e],
  [0x018f, 0x018f],
  [0x0192, 0x0192],
  [0x01a0, 0x01a1],
  [0x01af, 0x01b0],
  [0x01cd, 0x01ce],
  [0x01e4, 0x01e9],
  [0x0218, 0x021b],
  [0x0237, 0x0237],
  [0x0259, 0x0259],
  [0x02b9, 0x02b9],
  [0x02bc, 0x02bc],
  [0x02c6, 0x02c8],
  [0x02d8, 0x02dd],
  [0x0300, 0x0304],
  [0x0306, 0x030c],
  [0x0312, 0x0312],
  [0x031b, 0x031b],
  [0x0323, 0x0323],
  [0x0326, 0x0328],
  [0x0335, 0x0338],
  [0x039b, 0x039b],
  [0x03a9, 0x03a9],
  [0x03bb, 0x03bc],
  [0x03c0, 0x03c0],
  [0x03c9, 0x03c9],
  [0x0400, 0x045f],
  [0x0462, 0x0463],
  [0x046a, 0x046b],
  [0x0472, 0x0475],
  [0x0490, 0x0493],
  [0x0496, 0x0497],
  [0x049a, 0x049b],
  [0x04a2, 0x04a3],
  [0x04ae, 0x04b3],
  [0x04b6, 0x04b7],
  [0x04ba, 0x04bb],
  [0x04c0, 0x04c0],
  [0x04cf, 0x04cf],
  [0x04d8, 0x04d9],
  [0x04e2, 0x04e3],
  [0x04e8, 0x04e9],
  [0x04ee, 0x04ef],
  [0x0e3f, 0x0e3f],
  [0x1e20, 0x1e21],
  [0x1e80, 0x1e85],
  [0x1e9e, 0x1e9e],
  [0x1ea0, 0x1ef9],
  [0x2013, 0x2014],
  [0x2018, 0x201a],
  [0x201c, 0x201e],
  [0x2020, 0x2022],
  [0x2026, 0x2026],
  [0x2030, 0x2030],
  [0x2032, 0x2033],
  [0x2039, 0x203a],
  [0x2044, 0x2044],
  [0x2070, 0x2070],
  [0x2074, 0x2079],
  [0x2080, 0x2089],
  [0x20aa, 0x20aa],
  [0x20ac, 0x20ac],
  [0x20b1, 0x20b1],
  [0x20b4, 0x20b4],
  [0x20b9, 0x20b9],
  [0x20bd, 0x20bd],
  [0x2116, 0x2117],
  [0x2122, 0x2122],
  [0x2153, 0x2155],
  [0x215b, 0x215e],
  [0x2190, 0x2199],
  [0x219d, 0x219d],
  [0x21a9, 0x21aa],
  [0x21b0, 0x21b1],
  [0x21b3, 0x21b5],
  [0x21e4, 0x21e5],
  [0x21e7, 0x21e7],
  [0x2202, 0x2202],
  [0x2206, 0x2206],
  [0x220f, 0x220f],
  [0x2211, 0x2212],
  [0x221a, 0x221a],
  [0x221e, 0x221e],
  [0x222b, 0x222b],
  [0x2236, 0x2236],
  [0x2248, 0x2248],
  [0x2260, 0x2260],
  [0x2264, 0x2265],
  [0x2460, 0x2468],
  [0x24ea, 0x24ea],
  [0x24ff, 0x24ff],
  [0x25b2, 0x25b3],
  [0x25b6, 0x25b7],
  [0x25bc, 0x25bd],
  [0x25c0, 0x25c1],
  [0x25ca, 0x25cc],
  [0x25cf, 0x25cf],
  [0x2639, 0x263a],
  [0x2776, 0x277e],
  [0x3003, 0x3003],
  [0x301c, 0x301c],
  [0xa78b, 0xa78c],
  [0xf8ff, 0xf8ff],
  [0xfb01, 0xfb02],
] as const;

/**
 * Common Simplified Chinese characters verified missing from NotoSansJP-Regular.ttf (v57).
 * Used as a static fallback when the Japanese font binary is not loaded in memory.
 */
const SIMPLIFIED_CHINESE_ONLY_CPS = new Set<number>([
  0x4e1c, // 东
  0x4e3a, // 为
  0x4e60, // 习
  0x4e66, // 书
  0x4eec, // 们
  0x5220, // 删
  0x52a1, // 务
  0x52a8, // 动
  0x5355, // 单
  0x53d1, // 发
  0x5417, // 吗
  0x56fe, // 图
  0x5757, // 块
  0x5bf9, // 对
  0x5e93, // 库
  0x5e94, // 应
  0x5f55, // 录
  0x6001, // 态
  0x6237, // 户
  0x62a5, // 报
  0x62e9, // 择
  0x65f6, // 时
  0x67e5, // 查
  0x6837, // 样
  0x6b22, // 欢
  0x6d4b, // 测
  0x73b0, // 现
  0x7801, // 码
  0x7b80, // 简
  0x7ebf, // 线
  0x7ea7, // 级
  0x7ec4, // 组
  0x7ed9, // 给
  0x7f16, // 编
  0x8ba1, // 计
  0x8ba4, // 认
  0x8ba9, // 让
  0x8bd5, // 试
  0x8bbe, // 设
  0x8bc1, // 证
  0x8bdd, // 话
  0x8bed, // 语
  0x8bef, // 误
  0x8bf4, // 说
  0x8bf7, // 请
  0x8bfb, // 读
  0x8c22, // 谢
  0x8d44, // 资
  0x8f6f, // 软
  0x8f91, // 辑
  0x8fc7, // 过
  0x8fd8, // 还
  0x8fd9, // 这
  0x8fdb, // 进
  0x9009, // 选
  0x94fe, // 链
  0x9519, // 错
  0x95ee, // 问
  0x95f4, // 间
  0x9898, // 题
  0x9a8c, // 验
]);

const DEFAULT_LATIN_FONT_RELATIVE_PATH = "registry/fonts/Geist-Regular.ttf";
const JAPANESE_FONT_RELATIVE_PATH = "registry/fonts/cjk/NotoSansJP-Regular.ttf";

interface CachedFontEntry {
  data: ArrayBuffer;
  cmap: ReadonlySet<number>;
}

const fontCache = new Map<string, Promise<CachedFontEntry>>();
const graphemeSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

const EMOJI_BASE_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
const UNICODE_EMOJI_RE = /\p{Emoji}/u;
const ASCII_DIGIT_HASH_STAR_RE = /^[#*0-9]$/;

export function clearFontCache(): void {
  fontCache.clear();
}

export function getCachedFontPaths(): string[] {
  return Array.from(fontCache.keys());
}

export function isCodepointInGeist(cp: number): boolean {
  let low = 0;
  let high = GEIST_COVERED_RANGES.length - 1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    const [start, end] = GEIST_COVERED_RANGES[mid];
    if (cp < start) {
      high = mid - 1;
    } else if (cp > end) {
      low = mid + 1;
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Parses Unicode cmap subtables (Format 4 and Format 12) from a TrueType/OpenType font.
 */
export function parseTtfCmapCodepoints(buffer: ArrayBuffer): Set<number> {
  const view = new DataView(buffer);
  const numTables = view.getUint16(4, false);
  let cmapOffset = -1;

  for (let i = 0; i < numTables; i++) {
    const recOffset = 12 + i * 16;
    const tag = String.fromCharCode(
      view.getUint8(recOffset),
      view.getUint8(recOffset + 1),
      view.getUint8(recOffset + 2),
      view.getUint8(recOffset + 3),
    );
    if (tag === "cmap") {
      cmapOffset = view.getUint32(recOffset + 8, false);
      break;
    }
  }

  if (cmapOffset < 0) {
    throw new Error("Font binary does not contain a cmap table.");
  }

  const numSubtables = view.getUint16(cmapOffset + 2, false);
  let format12Offset = -1;
  let format4Offset = -1;

  for (let i = 0; i < numSubtables; i++) {
    const entryOffset = cmapOffset + 4 + i * 8;
    const platformId = view.getUint16(entryOffset, false);
    const encodingId = view.getUint16(entryOffset + 2, false);
    const isUnicodeSubtable =
      platformId === 0 ||
      (platformId === 3 && (encodingId === 1 || encodingId === 10));
    if (!isUnicodeSubtable) continue;

    const subtableOffset = cmapOffset + view.getUint32(entryOffset + 4, false);
    const format = view.getUint16(subtableOffset, false);
    if (format === 12 && format12Offset < 0) {
      format12Offset = subtableOffset;
    } else if (format === 4 && format4Offset < 0) {
      format4Offset = subtableOffset;
    }
  }

  const codepoints = new Set<number>();

  if (format12Offset >= 0) {
    const numGroups = view.getUint32(format12Offset + 12, false);
    for (let i = 0; i < numGroups; i++) {
      const groupOffset = format12Offset + 16 + i * 12;
      const startCharCode = view.getUint32(groupOffset, false);
      const endCharCode = view.getUint32(groupOffset + 4, false);
      for (let cp = startCharCode; cp <= endCharCode; cp++) {
        codepoints.add(cp);
      }
    }
    return codepoints;
  }

  if (format4Offset >= 0) {
    const segCount = view.getUint16(format4Offset + 6, false) >>> 1;
    const endCodeOffset = format4Offset + 14;
    const startCodeOffset = endCodeOffset + 2 + segCount * 2;
    const idDeltaOffset = startCodeOffset + segCount * 2;
    const idRangeOffset = idDeltaOffset + segCount * 2;

    for (let i = 0; i < segCount; i++) {
      const endCode = view.getUint16(endCodeOffset + i * 2, false);
      const startCode = view.getUint16(startCodeOffset + i * 2, false);
      const idDelta = view.getInt16(idDeltaOffset + i * 2, false);
      const rangeOffset = view.getUint16(idRangeOffset + i * 2, false);

      if (startCode === 0xffff) continue;

      for (let cp = startCode; cp <= endCode; cp++) {
        let glyphId: number;
        if (rangeOffset === 0) {
          glyphId = (cp + idDelta) & 0xffff;
        } else {
          const glyphOffset =
            idRangeOffset + i * 2 + rangeOffset + (cp - startCode) * 2;
          glyphId = view.getUint16(glyphOffset, false);
          if (glyphId !== 0) {
            glyphId = (glyphId + idDelta) & 0xffff;
          }
        }
        if (glyphId !== 0) {
          codepoints.add(cp);
        }
      }
    }
    return codepoints;
  }

  throw new Error("Font binary does not contain a Unicode format 4 or 12 cmap.");
}

function isEmojiGrapheme(grapheme: string): boolean {
  for (const ch of grapheme) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;

    // Variation Selector-16, Keycap combiner, ZWJ, or Supplementary Emoji blocks
    // always route through Satori's Twemoji CDN fetch.
    if (
      cp === 0xfe0f ||
      cp === 0x20e3 ||
      cp === 0x200d ||
      (cp >= 0x1f000 && cp <= 0x1faff) ||
      (cp >= 0x1f3fb && cp <= 0x1f3ff)
    ) {
      return true;
    }

    if (
      EMOJI_BASE_RE.test(ch) ||
      (UNICODE_EMOJI_RE.test(ch) && !ASCII_DIGIT_HASH_STAR_RE.test(ch))
    ) {
      // Plain text-presentation symbols mapped directly inside Geist (e.g. ☺, ☹, ©, ®, ™)
      // render offline without triggering a CDN fetch when not paired with VS16.
      if (!isCodepointInGeist(cp)) {
        return true;
      }
    }
  }
  return false;
}

function isWhitespaceOrFormat(cp: number): boolean {
  return cp === 0x09 || cp === 0x0a || cp === 0x0d || cp === 0x200c;
}

function isLatinCodepoint(cp: number): boolean {
  return (
    (cp >= 0x0041 && cp <= 0x005a) ||
    (cp >= 0x0061 && cp <= 0x007a) ||
    (cp >= 0x00c0 && cp <= 0x00d6) ||
    (cp >= 0x00d8 && cp <= 0x00f6) ||
    (cp >= 0x00f8 && cp <= 0x02af) ||
    (cp >= 0x1e00 && cp <= 0x1eff) ||
    (cp >= 0x2c60 && cp <= 0x2c7f) ||
    (cp >= 0xa720 && cp <= 0xa7ff) ||
    (cp >= 0xab30 && cp <= 0xab6f) ||
    (cp >= 0xfb00 && cp <= 0xfb06)
  );
}

function isCyrillicCodepoint(cp: number): boolean {
  return (
    (cp >= 0x0400 && cp <= 0x052f) ||
    (cp >= 0x2de0 && cp <= 0x2dff) ||
    (cp >= 0xa640 && cp <= 0xa69f)
  );
}

function isGreekCodepoint(cp: number): boolean {
  return (cp >= 0x0370 && cp <= 0x03ff) || (cp >= 0x1f00 && cp <= 0x1fff);
}

function isHangulCodepoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x11ff) ||
    (cp >= 0x3130 && cp <= 0x318f) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xd7b0 && cp <= 0xd7ff)
  );
}

function isHanCodepoint(cp: number): boolean {
  return (
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff)
  );
}

function isJapaneseScriptCodepoint(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x303f) ||
    (cp >= 0x3040 && cp <= 0x309f) ||
    (cp >= 0x30a0 && cp <= 0x30ff) ||
    (cp >= 0x31f0 && cp <= 0x31ff) ||
    (cp >= 0xff00 && cp <= 0xffef)
  );
}

function classifyNonEmojiCodepoint(
  cp: number,
  japaneseCmap?: ReadonlySet<number>,
): ScriptId | null {
  if (isWhitespaceOrFormat(cp)) return null;

  // Treat Greek letters as Greek script even when Geist happens to include
  // individual math/unit symbols like π or Ω.
  if (isGreekCodepoint(cp)) return "greek";

  if (isLatinCodepoint(cp)) {
    return isCodepointInGeist(cp) ? "latin" : "latin-extended";
  }

  if (isCyrillicCodepoint(cp)) {
    return isCodepointInGeist(cp) ? "cyrillic" : "cyrillic-extended";
  }

  if (isCodepointInGeist(cp)) {
    // Digits, ASCII punctuation, spaces, currency, arrows, and math symbols
    // covered by Geist render without any additional font or network call.
    return null;
  }

  if (isHangulCodepoint(cp)) return "hangul";

  if (
    (cp >= 0x3100 && cp <= 0x312f) ||
    (cp >= 0x31a0 && cp <= 0x31bf) ||
    (cp >= 0x20000 && cp <= 0x2ebef)
  ) {
    return "chinese";
  }

  if (isJapaneseScriptCodepoint(cp)) return "japanese";

  if (isHanCodepoint(cp)) {
    if (japaneseCmap) {
      return japaneseCmap.has(cp) ? "japanese" : "chinese";
    }
    return SIMPLIFIED_CHINESE_ONLY_CPS.has(cp) ? "chinese" : "japanese";
  }

  if ((cp >= 0x0900 && cp <= 0x097f) || (cp >= 0xa8e0 && cp <= 0xa8ff)) {
    return "devanagari";
  }

  if (
    (cp >= 0x0600 && cp <= 0x06ff) ||
    (cp >= 0x0750 && cp <= 0x077f) ||
    (cp >= 0x08a0 && cp <= 0x08ff) ||
    (cp >= 0xfb50 && cp <= 0xfdff) ||
    (cp >= 0xfe70 && cp <= 0xfeff)
  ) {
    return "arabic";
  }

  if ((cp >= 0x0590 && cp <= 0x05ff) || (cp >= 0xfb1d && cp <= 0xfb4f)) {
    return "hebrew";
  }

  if (cp >= 0x0980 && cp <= 0x0dff) {
    return "indic-other";
  }

  if (cp >= 0x0e00 && cp <= 0x0e7f) {
    return "thai";
  }

  if ((cp >= 0x0e80 && cp <= 0x109f) || (cp >= 0x1780 && cp <= 0x17ff)) {
    return "southeast-asian";
  }

  return "other";
}

function describeUnsupportedScript(
  script: ScriptId,
  options?: { japanesePackInstalled?: boolean },
): string {
  switch (script) {
    case "japanese":
      return options?.japanesePackInstalled
        ? "Japanese font pack is unavailable."
        : "Japanese requires the opt-in NotoSansJP font pack in registry/fonts/cjk/NotoSansJP-Regular.ttf.";
    case "latin-extended":
      return "Character is outside the default Geist-Regular.ttf Latin glyph set.";
    case "cyrillic-extended":
      return "Cyrillic character is outside the default Geist-Regular.ttf glyph set.";
    case "greek":
      return "Greek is not covered by Geist-Regular.ttf (only 6 technical/math symbols are included).";
    case "chinese":
      return "Simplified/Traditional Chinese characters outside Japanese JIS coverage are not supported by NotoSansJP.";
    case "hangul":
      return "Korean (Hangul) is not covered by Geist-Regular.ttf or NotoSansJP.";
    case "devanagari":
      return "Devanagari requires OpenType Indic shaping that Satori does not perform (produces broken conjuncts and vowel signs).";
    case "arabic":
      return "Arabic crashes Satori/opentype.js (GSUB lookupType 5 substFormat 3 is unsupported) and lacks RTL shaping.";
    case "hebrew":
      return "Hebrew RTL text and diacritic shaping are unverified and unsupported in v1.";
    case "thai":
      return "Thai mark positioning and word segmentation are not supported by Satori.";
    case "indic-other":
      return "Indic scripts require complex OpenType shaping that Satori does not perform.";
    case "southeast-asian":
      return "Complex Southeast Asian scripts are not supported by Satori or bundled fonts.";
    case "emoji":
      return "Emoji characters trigger an external CDN fetch (cdn.jsdelivr.net/gh/twitter/twemoji) in next/og, which violates offline rendering.";
    case "other":
    default:
      return "Text contains characters not covered by the installed fonts.";
  }
}

export function detectScripts(
  text: string,
  options?: { japaneseCmap?: ReadonlySet<number> },
): ScriptId[] {
  const found = new Set<ScriptId>();
  for (const { segment } of graphemeSegmenter.segment(text)) {
    if (isEmojiGrapheme(segment)) {
      found.add("emoji");
      continue;
    }
    for (const ch of segment) {
      const cp = ch.codePointAt(0);
      if (cp === undefined) continue;
      const script = classifyNonEmojiCodepoint(cp, options?.japaneseCmap);
      if (script) {
        found.add(script);
      }
    }
  }
  return Array.from(found);
}

const EMOJI_STRIP_REASON =
  "Emoji characters were stripped because next/og fetches emoji SVGs over the network at render time.";

export function stripEmojiFromText(text: string): {
  cleaned: string;
  removed: string[];
} {
  const removed: string[] = [];
  const kept: string[] = [];

  for (const { segment } of graphemeSegmenter.segment(text)) {
    if (isEmojiGrapheme(segment)) {
      removed.push(segment);
    } else {
      kept.push(segment);
    }
  }

  if (removed.length === 0) {
    return { cleaned: text, removed };
  }

  // Collapse extra spaces introduced when stripping inline or edge emojis.
  const cleaned = kept.join("").replace(/ {2,}/g, " ").trim();
  return { cleaned, removed };
}

function stripEmojiValue(
  value: unknown,
  prefix: string,
  warnings: EmojiWarning[],
): unknown {
  if (typeof value === "string") {
    const { cleaned, removed } = stripEmojiFromText(value);
    if (removed.length > 0) {
      warnings.push({
        field: prefix,
        removed: Array.from(new Set(removed)),
        reason: EMOJI_STRIP_REASON,
      });
    }
    return cleaned;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      stripEmojiValue(item, `${prefix}[${index}]`, warnings),
    );
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      result[key] = stripEmojiValue(nested, nextPrefix, warnings);
    }
    return result;
  }

  return value;
}

export function stripEmojiFromParams<T extends Record<string, unknown>>(
  inputs: T,
): { sanitized: T; warnings: EmojiWarning[] } {
  const warnings: EmojiWarning[] = [];
  const sanitized = stripEmojiValue(inputs, "", warnings) as T;
  return { sanitized, warnings };
}

export function detectScriptsInParams(
  inputs: Record<string, unknown>,
  options?: { japaneseCmap?: ReadonlySet<number> },
): ScriptId[] {
  const fields: Array<{ field: string; text: string }> = [];
  collectStringFields(inputs, "", fields);
  const found = new Set<ScriptId>();
  for (const { text } of fields) {
    for (const script of detectScripts(text, options)) {
      found.add(script);
    }
  }
  return Array.from(found);
}

function collectStringFields(
  value: unknown,
  prefix: string,
  out: Array<{ field: string; text: string }>,
): void {
  if (typeof value === "string") {
    out.push({ field: prefix, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectStringFields(item, `${prefix}[${index}]`, out);
    });
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      collectStringFields(nested, nextPrefix, out);
    }
  }
}

export function findUnsupportedScripts(
  inputs: Record<string, unknown>,
  options?: {
    supportedScripts?: readonly SupportedScript[];
    japaneseCmap?: ReadonlySet<number>;
  },
): UnsupportedScriptIssue[] {
  const allowed = new Set<ScriptId>(
    options?.supportedScripts ?? BASE_SUPPORTED_SCRIPTS,
  );
  const japanesePackInstalled = allowed.has("japanese");
  const fields: Array<{ field: string; text: string }> = [];
  collectStringFields(inputs, "", fields);

  const issues: UnsupportedScriptIssue[] = [];

  for (const { field, text } of fields) {
    const seenForField = new Set<ScriptId>();

    for (const { segment } of graphemeSegmenter.segment(text)) {
      if (isEmojiGrapheme(segment)) {
        if (!seenForField.has("emoji")) {
          seenForField.add("emoji");
          issues.push({
            field,
            script: "emoji",
            reason: describeUnsupportedScript("emoji", {
              japanesePackInstalled,
            }),
            sampleChar: segment,
          });
        }
        continue;
      }

      for (const ch of segment) {
        const cp = ch.codePointAt(0);
        if (cp === undefined) continue;
        const script = classifyNonEmojiCodepoint(cp, options?.japaneseCmap);
        if (script && !allowed.has(script) && !seenForField.has(script)) {
          seenForField.add(script);
          issues.push({
            field,
            script,
            reason: describeUnsupportedScript(script, {
              japanesePackInstalled,
            }),
            sampleChar: ch,
          });
        }
      }
    }
  }

  return issues;
}

async function readFontEntry(
  cacheKey: string,
  fontFile: "Geist-Regular.ttf" | "cjk/NotoSansJP-Regular.ttf",
): Promise<CachedFontEntry> {
  const cached = fontCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const loadPromise = (async (): Promise<CachedFontEntry> => {
    const fullPath =
      fontFile === "Geist-Regular.ttf"
        ? path.join(process.cwd(), "registry", "fonts", "Geist-Regular.ttf")
        : path.join(
            process.cwd(),
            "registry",
            "fonts",
            "cjk",
            "NotoSansJP-Regular.ttf",
          );
    const buffer = await readFile(fullPath);
    const data = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const cmap = parseTtfCmapCodepoints(data);
    return { data, cmap };
  })();

  // Store promise so concurrent cold requests share a single disk read,
  // and evict if reading fails so transient FS issues can recover.
  fontCache.set(cacheKey, loadPromise);
  loadPromise.catch(() => {
    fontCache.delete(cacheKey);
  });

  return loadPromise;
}

export async function hasJapaneseFontPack(): Promise<boolean> {
  if (fontCache.has(JAPANESE_FONT_RELATIVE_PATH)) {
    try {
      await fontCache.get(JAPANESE_FONT_RELATIVE_PATH);
      return true;
    } catch {
      return false;
    }
  }
  try {
    await access(
      path.join(
        process.cwd(),
        "registry",
        "fonts",
        "cjk",
        "NotoSansJP-Regular.ttf",
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function getSupportedScripts(): Promise<SupportedScript[]> {
  if (await hasJapaneseFontPack()) {
    return ["latin", "cyrillic", "japanese"];
  }
  return [...BASE_SUPPORTED_SCRIPTS];
}

export async function getJapaneseFontCmap(): Promise<ReadonlySet<number> | null> {
  if (!(await hasJapaneseFontPack())) {
    return null;
  }
  const entry = await readFontEntry(
    JAPANESE_FONT_RELATIVE_PATH,
    "cjk/NotoSansJP-Regular.ttf",
  );
  return entry.cmap;
}

export async function loadFontsForScripts(
  scripts: readonly ScriptId[],
): Promise<LoadedFont[]> {
  const geist = await readFontEntry(
    DEFAULT_LATIN_FONT_RELATIVE_PATH,
    "Geist-Regular.ttf",
  );
  const loaded: LoadedFont[] = [
    {
      name: "Geist",
      data: geist.data,
      weight: 400,
      style: "normal",
    },
  ];

  if (scripts.includes("japanese")) {
    const installed = await hasJapaneseFontPack();
    if (!installed) {
      throw new UnsupportedScriptError([
        {
          field: "text",
          script: "japanese",
          reason: describeUnsupportedScript("japanese", {
            japanesePackInstalled: false,
          }),
          sampleChar: "あ",
        },
      ]);
    }
    const notoJp = await readFontEntry(
      JAPANESE_FONT_RELATIVE_PATH,
      "cjk/NotoSansJP-Regular.ttf",
    );
    loaded.push({
      name: "Noto Sans JP",
      data: notoJp.data,
      weight: 400,
      style: "normal",
    });
  }

  return loaded;
}
