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

  it("handles empty and whitespace-only titles gracefully at maxFontSize", () => {
    for (const empty of ["", "   ", "\n\t"]) {
      const result = autoFit(empty, {
        maxWidth: 960,
        maxLines: 2,
        maxFontSize: 68,
        minFontSize: 36,
      });

      expect(result.fontSize).toBe(68);
      expect(result.estimatedLines).toBe(1);
      expect(result.overflowsAtMinSize).toBe(false);
    }
  });

  it("treats slashes and hyphens as wrap points in long repository names", () => {
    const repoName = "acme-enterprise-platform/declarative-social-card-engine";
    const result = autoFit(repoName, {
      maxWidth: 900,
      maxLines: 2,
      maxFontSize: 62,
      minFontSize: 32,
    });

    expect(result.estimatedLines).toBeLessThanOrEqual(2);
    expect(result.overflowsAtMinSize).toBe(false);
  });

  it("handles max-length inputs across all three templates without unexpected overflow", () => {
    const maxMinimal = autoFit("Word ".repeat(16).trim(), {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 32,
    });
    expect(maxMinimal.fontSize).toBeGreaterThanOrEqual(32);
    expect(maxMinimal.estimatedLines).toBeLessThanOrEqual(2);

    const maxRepo = autoFit("acme-org/" + "repo-part-".repeat(5) + "x", {
      maxWidth: 900,
      maxLines: 2,
      maxFontSize: 62,
      minFontSize: 30,
    });
    expect(maxRepo.fontSize).toBeGreaterThanOrEqual(30);
    expect(maxRepo.estimatedLines).toBeLessThanOrEqual(2);

    const maxBlog = autoFit("Engineering Post Title ".repeat(4) + "Guide", {
      maxWidth: 940,
      maxLines: 3,
      maxFontSize: 64,
      minFontSize: 34,
    });
    expect(maxBlog.fontSize).toBeGreaterThanOrEqual(34);
    expect(maxBlog.estimatedLines).toBeLessThanOrEqual(3);
  });

  it("scales down a single 60-char unbroken word and flags 80-char extreme tokens", () => {
    const word60 = "a".repeat(60);
    const res60 = autoFit(word60, {
      maxWidth: 900,
      maxLines: 2,
      maxFontSize: 62,
      minFontSize: 24,
    });
    expect(res60.fontSize).toBeLessThanOrEqual(26);

    const word80 = "W".repeat(80);
    const res80 = autoFit(word80, {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 36,
    });
    expect(res80.fontSize).toBe(36);
    expect(res80.overflowsAtMinSize).toBe(true);
  });
});
