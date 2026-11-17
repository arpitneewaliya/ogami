export interface ContrastColorPair {
  /** Human-readable description of the text/element being checked. */
  label: string;
  /** Default foreground hex color (#RGB or #RRGGBB). */
  foreground: string;
  /** Default background hex color (#RGB or #RRGGBB). */
  background: string;
  /**
   * True when text meets WCAG large text criteria (>= 24px regular or >= 18.67px bold)
   * or UI graphics, lowering the AA threshold from 4.5:1 to 3.0:1.
   */
  largeText?: boolean;
  /** Optional template parameter key whose value overrides `foreground`. */
  foregroundParam?: string;
  /** Optional template parameter key whose value overrides `background`. */
  backgroundParam?: string;
}

export interface ContrastCheckResult {
  label: string;
  foreground: string;
  background: string;
  largeText: boolean;
  ratio: number;
  requiredRatio: number;
  passes: boolean;
  passesAaNormal: boolean;
  passesAaLarge: boolean;
  passesAaa: boolean;
}

export interface TemplateContrastReport {
  declaredCount: number;
  results: ContrastCheckResult[];
  warnings: ContrastCheckResult[];
}

export const WCAG_AA_NORMAL_MIN = 4.5;
export const WCAG_AA_LARGE_MIN = 3.0;
export const WCAG_AAA_NORMAL_MIN = 7.0;
export const WCAG_AAA_LARGE_MIN = 4.5;

const SHORT_HEX_RE = /^#([0-9a-fA-F]{3})$/;
const FULL_HEX_RE = /^#([0-9a-fA-F]{6})$/;

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(value: unknown): RgbColor | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();

  const shortMatch = SHORT_HEX_RE.exec(trimmed);
  if (shortMatch) {
    const [r, g, b] = shortMatch[1].split("");
    return {
      r: Number.parseInt(r + r, 16),
      g: Number.parseInt(g + g, 16),
      b: Number.parseInt(b + b, 16),
    };
  }

  const fullMatch = FULL_HEX_RE.exec(trimmed);
  if (fullMatch) {
    const hex = fullMatch[1];
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    };
  }

  return null;
}

function linearizeSrgbChannel(channel255: number): number {
  const srgb = channel255 / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/**
 * Computes WCAG 2.1 relative luminance in [0, 1] for a #RGB or #RRGGBB hex string.
 */
export function getRelativeLuminance(hex: string): number | null {
  const rgb = parseHexColor(hex);
  if (!rgb) return null;
  const r = linearizeSrgbChannel(rgb.r);
  const g = linearizeSrgbChannel(rgb.g);
  const b = linearizeSrgbChannel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes the WCAG 2.x contrast ratio in [1, 21] between two hex colors.
 */
export function getContrastRatio(fgHex: string, bgHex: string): number | null {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveColorCandidate(
  fallbackHex: string,
  paramName: string | undefined,
  params: Record<string, unknown> | undefined,
): string | null {
  if (paramName && params && paramName in params) {
    const candidate = params[paramName];
    if (parseHexColor(candidate) === null) {
      return null;
    }
    return (candidate as string).trim();
  }
  return parseHexColor(fallbackHex) ? fallbackHex.trim() : null;
}

export function evaluateContrastPair(
  pair: ContrastColorPair,
  params?: Record<string, unknown>,
): ContrastCheckResult | null {
  const foreground = resolveColorCandidate(
    pair.foreground,
    pair.foregroundParam,
    params,
  );
  const background = resolveColorCandidate(
    pair.background,
    pair.backgroundParam,
    params,
  );
  if (!foreground || !background) return null;

  const ratio = getContrastRatio(foreground, background);
  if (ratio === null) return null;

  const largeText = Boolean(pair.largeText);
  const requiredRatio = largeText ? WCAG_AA_LARGE_MIN : WCAG_AA_NORMAL_MIN;
  const passes = ratio >= requiredRatio;

  return {
    label: pair.label,
    foreground,
    background,
    largeText,
    ratio,
    requiredRatio,
    passes,
    passesAaNormal: ratio >= WCAG_AA_NORMAL_MIN,
    passesAaLarge: ratio >= WCAG_AA_LARGE_MIN,
    passesAaa: ratio >= (largeText ? WCAG_AAA_LARGE_MIN : WCAG_AAA_NORMAL_MIN),
  };
}

export function evaluateTemplateContrast(
  pairs: readonly ContrastColorPair[] | undefined,
  params?: Record<string, unknown>,
): TemplateContrastReport {
  if (!pairs || pairs.length === 0) {
    return {
      declaredCount: 0,
      results: [],
      warnings: [],
    };
  }

  const results: ContrastCheckResult[] = [];
  for (const pair of pairs) {
    const evaluated = evaluateContrastPair(pair, params);
    if (evaluated) {
      results.push(evaluated);
    }
  }

  return {
    declaredCount: pairs.length,
    results,
    warnings: results.filter((item) => !item.passes),
  };
}
