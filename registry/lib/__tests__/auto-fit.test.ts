import { describe, expect, it } from "vitest";
import { autoFit, estimateTextMetrics } from "../auto-fit";

describe("autoFit", () => {
  it("keeps short titles at maxFontSize", () => {
    const result = autoFit("Acme Toolkit", {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 36,
    });

    expect(result.fontSize).toBe(68);
    expect(result.estimatedLines).toBe(1);
    expect(result.overflowsAtMinSize).toBe(false);
  });

  it("reduces fontSize monotonically as title length grows", () => {
    const shortRes = autoFit("Short release title", {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 36,
    });
    const mediumRes = autoFit(
      "Shipping faster Open Graph previews for modern Next.js applications",
      {
        maxWidth: 960,
        maxLines: 2,
        maxFontSize: 68,
        minFontSize: 36,
      },
    );
    const longRes = autoFit(
      "Shipping faster Open Graph previews with automated layout guardrails and script detection for production Next.js applications",
      {
        maxWidth: 960,
        maxLines: 2,
        maxFontSize: 68,
        minFontSize: 36,
      },
    );

    expect(shortRes.fontSize).toBeGreaterThanOrEqual(mediumRes.fontSize);
    expect(mediumRes.fontSize).toBeGreaterThan(longRes.fontSize);
    expect(longRes.fontSize).toBeGreaterThanOrEqual(36);
  });

  it("scales down single unbroken long tokens so they fit within maxWidth", () => {
    const unbroken = "superlongorganizationnamewithoutanyspaces";
    const result = autoFit(unbroken, {
      maxWidth: 800,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 28,
    });

    expect(result.fontSize).toBeLessThan(68);
    expect(result.overflowsAtMinSize).toBe(false);
  });

  it("clamps to minFontSize and marks overflowsAtMinSize when text still exceeds maxLines", () => {
    const extreme = "W".repeat(200);
    const result = autoFit(extreme, {
      maxWidth: 600,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 36,
    });

    expect(result.fontSize).toBe(36);
    expect(result.overflowsAtMinSize).toBe(true);
    expect(result.estimatedLines).toBeGreaterThan(2);
  });

  it("assigns wider visual width per character to Japanese text than narrow Latin ASCII", () => {
    const latinMetrics = estimateTextMetrics("iiiiiiiiii");
    const jpMetrics = estimateTextMetrics("あいうえおかきくけこ");

    expect(jpMetrics.hasJapanese).toBe(true);
    expect(latinMetrics.hasJapanese).toBe(false);
    expect(jpMetrics.totalEm).toBeGreaterThan(latinMetrics.totalEm);
  });
});
