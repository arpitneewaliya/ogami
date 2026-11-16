export interface AutoFitOptions {
  /** Available horizontal space for text in pixels. */
  maxWidth: number;
  /** Target maximum number of lines before reducing font size. Defaults to 2. */
  maxLines?: number;
  /** Starting/maximum font size in pixels. Defaults to 68. */
  maxFontSize?: number;
  /** Minimum font size in pixels. Defaults to 36. */
  minFontSize?: number;
  /** Line height multiplier passed back to the caller. Defaults to 1.18. */
  lineHeight?: number;
}

export interface AutoFitResult {
  fontSize: number;
  lineHeight: number;
  estimatedLines: number;
  overflowsAtMinSize: boolean;
}

const NARROW_ASCII = new Set([
  " ",
  "!",
  "'",
  ",",
  "-",
  ".",
  ":",
  ";",
  "I",
  "|",
  "i",
  "j",
  "l",
  "t",
]);

const WIDE_CHARS = new Set([
  "@",
  "%",
  "M",
  "W",
  "m",
  "w",
  "Ж",
  "Ф",
  "Ш",
  "Щ",
  "Ы",
  "Ю",
  "ж",
  "ф",
  "ш",
  "щ",
  "ы",
  "ю",
]);

function isFullwidthOrJapanese(cp: number): boolean {
  return (
    (cp >= 0x3000 && cp <= 0x30ff) ||
    (cp >= 0x31f0 && cp <= 0x31ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xff00 && cp <= 0xffef)
  );
}

function charWidthInEm(ch: string): number {
  if (NARROW_ASCII.has(ch)) return 0.32;
  if (WIDE_CHARS.has(ch)) return 0.85;

  const cp = ch.codePointAt(0);
  if (cp === undefined) return 0.55;

  if (isFullwidthOrJapanese(cp)) return 1.0;

  // Uppercase Latin and Cyrillic letters
  if (
    (cp >= 0x0041 && cp <= 0x005a) ||
    (cp >= 0x0410 && cp <= 0x042f) ||
    cp === 0x0401
  ) {
    return 0.68;
  }

  return 0.55;
}

export function estimateTextMetrics(text: string): {
  totalEm: number;
  longestTokenEm: number;
  hasJapanese: boolean;
} {
  let totalEm = 0;
  let currentTokenEm = 0;
  let longestTokenEm = 0;
  let hasJapanese = false;

  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && isFullwidthOrJapanese(cp)) {
      hasJapanese = true;
    }

    const w = charWidthInEm(ch);
    totalEm += w;

    if (ch === " " || ch === "\t" || ch === "\n") {
      if (currentTokenEm > longestTokenEm) {
        longestTokenEm = currentTokenEm;
      }
      currentTokenEm = 0;
    } else if (cp !== undefined && isFullwidthOrJapanese(cp)) {
      // Satori can wrap CJK characters at character boundaries.
      if (currentTokenEm > longestTokenEm) {
        longestTokenEm = currentTokenEm;
      }
      if (w > longestTokenEm) {
        longestTokenEm = w;
      }
      currentTokenEm = 0;
    } else {
      currentTokenEm += w;
    }
  }

  if (currentTokenEm > longestTokenEm) {
    longestTokenEm = currentTokenEm;
  }

  return { totalEm, longestTokenEm, hasJapanese };
}

/**
 * Simple v1 script-aware heuristic that steps font size down from `maxFontSize`
 * to `minFontSize` until estimated wrapped lines fit within `maxLines` and the
 * longest unbroken word fits within `maxWidth`.
 */
export function autoFit(
  text: string,
  options: AutoFitOptions,
): AutoFitResult {
  const maxWidth = Math.max(1, options.maxWidth);
  const maxLines = Math.max(1, options.maxLines ?? 2);
  const maxFontSize = Math.max(8, options.maxFontSize ?? 68);
  const minFontSize = Math.max(8, Math.min(maxFontSize, options.minFontSize ?? 36));
  const lineHeight = options.lineHeight ?? 1.18;

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      fontSize: maxFontSize,
      lineHeight,
      estimatedLines: 1,
      overflowsAtMinSize: false,
    };
  }

  const { totalEm, longestTokenEm, hasJapanese } = estimateTextMetrics(trimmed);
  const packingFactor = hasJapanese ? 0.95 : 0.88;
  const effectiveWidth = maxWidth * packingFactor;
  const step = 2;

  for (let size = maxFontSize; size >= minFontSize; size -= step) {
    const estimatedLines = Math.max(
      1,
      Math.ceil((totalEm * size) / effectiveWidth),
    );
    const longestFits = longestTokenEm * size <= maxWidth;
    if (estimatedLines <= maxLines && longestFits) {
      return {
        fontSize: size,
        lineHeight,
        estimatedLines,
        overflowsAtMinSize: false,
      };
    }
  }

  const minEstimatedLines = Math.max(
    1,
    Math.ceil((totalEm * minFontSize) / effectiveWidth),
  );
  const minFits =
    minEstimatedLines <= maxLines && longestTokenEm * minFontSize <= maxWidth;

  return {
    fontSize: minFontSize,
    lineHeight,
    estimatedLines: minEstimatedLines,
    overflowsAtMinSize: !minFits,
  };
}
