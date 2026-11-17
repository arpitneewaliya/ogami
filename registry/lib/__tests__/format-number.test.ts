import { describe, expect, it } from "vitest";
import { z } from "zod";
import { coerceSearchParams } from "../define-template";
import {
  formatNumber,
  nonNegativeSafeIntParam,
  numberFormatParam,
} from "../format-number";

describe("formatNumber", () => {
  it("formats compact numbers below 1,000 accurately and floors k/M/B/T above 1,000", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(999)).toBe("999");

    expect(formatNumber(1_000)).toBe("1k");
    expect(formatNumber(1_200)).toBe("1.2k");
    expect(formatNumber(1_990)).toBe("1.9k");
    expect(formatNumber(1_999)).toBe("1.9k");
    expect(formatNumber(10_000)).toBe("10k");

    // Rollover checks: never emit 1000k or 1000B
    expect(formatNumber(999_999)).toBe("999.9k");
    expect(formatNumber(1_000_000)).toBe("1M");
    expect(formatNumber(1_250_000)).toBe("1.2M");
    expect(formatNumber(999_999_999)).toBe("999.9M");
    expect(formatNumber(1_000_000_000)).toBe("1B");
    expect(formatNumber(999_999_999_999)).toBe("999.9B");
    expect(formatNumber(1_000_000_000_000)).toBe("1T");
    expect(formatNumber(Number.MAX_SAFE_INTEGER)).toBe("9,007.1T");
  });

  it("formats exact numbers with en-US digit grouping", () => {
    expect(formatNumber(0, "exact")).toBe("0");
    expect(formatNumber(999, "exact")).toBe("999");
    expect(formatNumber(1_000, "exact")).toBe("1,000");
    expect(formatNumber(1_200, "exact")).toBe("1,200");
    expect(formatNumber(999_999_999_999, "exact")).toBe("999,999,999,999");
    expect(formatNumber(Number.MAX_SAFE_INTEGER, "exact")).toBe(
      "9,007,199,254,740,991",
    );
  });

  it("throws RangeError on negative, decimal, non-finite, or unsafe integers", () => {
    for (const bad of [
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => formatNumber(bad)).toThrow(RangeError);
    }
  });
});

describe("nonNegativeSafeIntParam and query coercion", () => {
  const schema = z.object({
    count: nonNegativeSafeIntParam,
    format: numberFormatParam,
  });

  it("accepts 0, 999, 1000, 1999, 999999, 1000000, and Number.MAX_SAFE_INTEGER", () => {
    for (const valid of [
      0,
      999,
      1_000,
      1_999,
      999_999,
      1_000_000,
      999_999_999_999,
      Number.MAX_SAFE_INTEGER,
    ]) {
      const coerced = coerceSearchParams(
        new URLSearchParams({ count: String(valid) }),
        schema,
      );
      const parsed = schema.safeParse(coerced);
      expect(parsed.success).toBe(true);
    }
  });

  it("rejects NaN, Infinity, negative, decimal, empty, and > Number.MAX_SAFE_INTEGER query values", () => {
    for (const bad of [
      "NaN",
      "Infinity",
      "-Infinity",
      "-1",
      "1.5",
      "1.0",
      "",
      "9007199254740992", // Number.MAX_SAFE_INTEGER + 1
      "1e25",
    ]) {
      const coerced = coerceSearchParams(
        new URLSearchParams({ count: bad }),
        schema,
      );
      const parsed = schema.safeParse(coerced);
      expect(parsed.success).toBe(false);
    }
  });
});
