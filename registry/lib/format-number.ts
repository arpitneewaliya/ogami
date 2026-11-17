import { z } from "zod";

export const NUMBER_FORMATS = ["compact", "exact"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export const numberFormatParam = z.enum(NUMBER_FORMATS).default("compact");

/**
 * Shared non-negative safe integer parameter schema for numeric template inputs.
 */
export const nonNegativeSafeIntParam = z
  .number()
  .int()
  .min(0)
  .max(Number.MAX_SAFE_INTEGER);

const COMPACT_UNITS: ReadonlyArray<{
  threshold: number;
  tenthStep: number;
  suffix: string;
}> = [
  { threshold: 1_000_000_000_000, tenthStep: 100_000_000_000, suffix: "T" },
  { threshold: 1_000_000_000, tenthStep: 100_000_000, suffix: "B" },
  { threshold: 1_000_000, tenthStep: 100_000, suffix: "M" },
  { threshold: 1_000, tenthStep: 100, suffix: "k" },
];

/**
 * Formats a non-negative safe integer using `en-US` rules.
 *
 * - `"compact"` (default): exact integer below `1,000`; at `1,000+` uses
 *   `k`/`M`/`B`/`T` floored to at most one decimal with trailing `.0` trimmed.
 * - `"exact"`: `en-US` digit grouping (e.g. `1,200`).
 */
export function formatNumber(
  value: number,
  format: NumberFormat = "compact",
): string {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new RangeError(
      `Expected a non-negative safe integer, received ${String(value)}.`,
    );
  }

  if (format === "exact") {
    return new Intl.NumberFormat("en-US").format(value);
  }

  if (value < 1_000) {
    return String(value);
  }

  // Subtracting `value % tenthStep` first yields an exact integer multiple
  // within safe-integer bounds, keeping floored tenths exact without BigInt.
  for (const unit of COMPACT_UNITS) {
    if (value >= unit.threshold) {
      const flooredMultiple = value - (value % unit.tenthStep);
      const tenths = Math.round(flooredMultiple / unit.tenthStep);
      const frac = tenths % 10;
      const whole = (tenths - frac) / 10;
      const wholeStr =
        whole >= 1_000
          ? new Intl.NumberFormat("en-US").format(whole)
          : String(whole);
      return frac === 0
        ? `${wholeStr}${unit.suffix}`
        : `${wholeStr}.${frac}${unit.suffix}`;
    }
  }

  return String(value);
}
