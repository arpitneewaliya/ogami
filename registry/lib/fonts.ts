import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE_SUPPORTED_SCRIPTS,
  UnsupportedScriptError,
  describeUnsupportedScript,
  type ScriptId,
  type SupportedScript,
} from "./scripts";

export {
  BASE_SUPPORTED_SCRIPTS,
  GEIST_COVERED_RANGES,
  UnsupportedScriptError,
  describeUnsupportedScript,
  detectScripts,
  detectScriptsInParams,
  findUnsupportedScripts,
  isCodepointInGeist,
  stripEmojiFromParams,
  stripEmojiFromText,
  supportedScripts,
  type EmojiWarning,
  type ScriptId,
  type SupportedScript,
  type UnsupportedScript,
  type UnsupportedScriptIssue,
} from "./scripts";

export interface LoadedFont {
  name: string;
  data: ArrayBuffer;
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
}

const DEFAULT_LATIN_FONT_RELATIVE_PATH = "registry/fonts/Geist-Regular.ttf";
const DEFAULT_LATIN_BOLD_FONT_RELATIVE_PATH = "registry/fonts/Geist-Bold.ttf";
const JAPANESE_FONT_RELATIVE_PATH = "registry/fonts/cjk/NotoSansJP-Regular.ttf";

interface CachedFontEntry {
  data: ArrayBuffer;
  cmap: ReadonlySet<number>;
}

const fontCache = new Map<string, Promise<CachedFontEntry>>();

export function clearFontCache(): void {
  fontCache.clear();
}

export function getCachedFontPaths(): string[] {
  return Array.from(fontCache.keys());
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

type KnownFontFile =
  | "Geist-Regular.ttf"
  | "Geist-Bold.ttf"
  | "cjk/NotoSansJP-Regular.ttf";

async function ignoreMissing(promise: Promise<Buffer>): Promise<Buffer | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

async function ignoreMissingAccess(promise: Promise<void>): Promise<boolean> {
  try {
    await promise;
    return true;
  } catch {
    return false;
  }
}

async function readCustomFontsDirFont(
  fontFile: KnownFontFile,
): Promise<Buffer | null> {
  const customDir = process.env.OGAMI_FONTS_DIR?.trim();
  if (!customDir) return null;

  if (fontFile === "Geist-Regular.ttf") {
    return ignoreMissing(
      readFile(/*turbopackIgnore: true*/ path.join(customDir, "Geist-Regular.ttf")),
    );
  }
  if (fontFile === "Geist-Bold.ttf") {
    return ignoreMissing(
      readFile(/*turbopackIgnore: true*/ path.join(customDir, "Geist-Bold.ttf")),
    );
  }
  return ignoreMissing(
    readFile(
      /*turbopackIgnore: true*/ path.join(
        customDir,
        "cjk",
        "NotoSansJP-Regular.ttf",
      ),
    ),
  );
}

async function readFontBuffer(fontFile: KnownFontFile): Promise<Buffer> {
  const customBuffer = await readCustomFontsDirFont(fontFile);
  if (customBuffer) return customBuffer;

  if (fontFile === "Geist-Regular.ttf") {
    const buffer =
      (await ignoreMissing(
        readFile(
          path.join(process.cwd(), "registry", "fonts", "Geist-Regular.ttf"),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          path.join(process.cwd(), "ogami", "fonts", "Geist-Regular.ttf"),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          path.join(
            process.cwd(),
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Regular.ttf",
          ),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          /*turbopackIgnore: true*/ path.join(
            process.cwd(),
            "..",
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Regular.ttf",
          ),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          /*turbopackIgnore: true*/ path.join(
            process.cwd(),
            "..",
            "..",
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Regular.ttf",
          ),
        ),
      ));
    if (buffer) return buffer;
  } else if (fontFile === "Geist-Bold.ttf") {
    const buffer =
      (await ignoreMissing(
        readFile(
          path.join(process.cwd(), "registry", "fonts", "Geist-Bold.ttf"),
        ),
      )) ??
      (await ignoreMissing(
        readFile(path.join(process.cwd(), "ogami", "fonts", "Geist-Bold.ttf")),
      )) ??
      (await ignoreMissing(
        readFile(
          path.join(
            process.cwd(),
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Bold.ttf",
          ),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          /*turbopackIgnore: true*/ path.join(
            process.cwd(),
            "..",
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Bold.ttf",
          ),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          /*turbopackIgnore: true*/ path.join(
            process.cwd(),
            "..",
            "..",
            "node_modules",
            "geist",
            "dist",
            "fonts",
            "geist-sans",
            "Geist-Bold.ttf",
          ),
        ),
      ));
    if (buffer) return buffer;
  } else {
    const buffer =
      (await ignoreMissing(
        readFile(
          path.join(
            process.cwd(),
            "registry",
            "fonts",
            "cjk",
            "NotoSansJP-Regular.ttf",
          ),
        ),
      )) ??
      (await ignoreMissing(
        readFile(
          path.join(
            process.cwd(),
            "ogami",
            "fonts",
            "cjk",
            "NotoSansJP-Regular.ttf",
          ),
        ),
      ));
    if (buffer) return buffer;
  }

  throw new Error(
    `Could not find font "${fontFile}". Install the "geist" npm package, place fonts in ogami/fonts/, or set OGAMI_FONTS_DIR.`,
  );
}

async function readFontEntry(
  cacheKey: string,
  fontFile: KnownFontFile,
): Promise<CachedFontEntry> {
  const cached = fontCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const loadPromise = (async (): Promise<CachedFontEntry> => {
    const buffer = await readFontBuffer(fontFile);
    const data = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(data).set(buffer);
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
  const customDir = process.env.OGAMI_FONTS_DIR?.trim();
  if (
    customDir &&
    (await ignoreMissingAccess(
      access(
        /*turbopackIgnore: true*/ path.join(
          customDir,
          "cjk",
          "NotoSansJP-Regular.ttf",
        ),
      ),
    ))
  ) {
    return true;
  }
  if (
    await ignoreMissingAccess(
      access(
        path.join(
          process.cwd(),
          "registry",
          "fonts",
          "cjk",
          "NotoSansJP-Regular.ttf",
        ),
      ),
    )
  ) {
    return true;
  }
  return ignoreMissingAccess(
    access(
      path.join(
        process.cwd(),
        "ogami",
        "fonts",
        "cjk",
        "NotoSansJP-Regular.ttf",
      ),
    ),
  );
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
  const [geistRegular, geistBold] = await Promise.all([
    readFontEntry(DEFAULT_LATIN_FONT_RELATIVE_PATH, "Geist-Regular.ttf"),
    readFontEntry(DEFAULT_LATIN_BOLD_FONT_RELATIVE_PATH, "Geist-Bold.ttf"),
  ]);
  const loaded: LoadedFont[] = [
    {
      name: "Geist",
      data: geistRegular.data,
      weight: 400,
      style: "normal",
    },
    {
      name: "Geist",
      data: geistBold.data,
      weight: 700,
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
