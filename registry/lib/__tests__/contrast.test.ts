import { describe, expect, it } from "vitest";
import {
  WCAG_AA_LARGE_MIN,
  WCAG_AA_NORMAL_MIN,
  evaluateContrastPair,
  evaluateTemplateContrast,
  getContrastRatio,
  getRelativeLuminance,
  parseHexColor,
} from "../contrast";

describe("WCAG contrast helper", () => {
  it("parses #RGB and #RRGGBB hex colors and rejects invalid strings", () => {
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor(" #09090B ")).toEqual({ r: 9, g: 9, b: 11 });
    expect(parseHexColor("red")).toBeNull();
    expect(parseHexColor("#12345")).toBeNull();
    expect(parseHexColor("#12345678")).toBeNull();
    expect(parseHexColor(123)).toBeNull();
  });

  it("computes relative luminance and WCAG contrast ratios accurately", () => {
    expect(getRelativeLuminance("#000000")).toBe(0);
    expect(getRelativeLuminance("#ffffff")).toBe(1);
    expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(getContrastRatio("#111113", "#fafafa")).toBeGreaterThan(17);
  });

  it("applies 4.5:1 threshold for normal text and 3:1 threshold for largeText", () => {
    // #767676 on #ffffff has ~4.54:1 contrast
    const aaNormal = evaluateContrastPair({
      label: "Muted text",
      foreground: "#767676",
      background: "#ffffff",
      largeText: false,
    });
    expect(aaNormal?.requiredRatio).toBe(WCAG_AA_NORMAL_MIN);
    expect(aaNormal?.passes).toBe(true);

    // #888888 on #ffffff has ~3.54:1 contrast: fails normal (4.5), passes large (3.0)
    const normalFail = evaluateContrastPair({
      label: "Gray normal",
      foreground: "#888888",
      background: "#ffffff",
      largeText: false,
    });
    expect(normalFail?.passes).toBe(false);

    const largePass = evaluateContrastPair({
      label: "Gray large",
      foreground: "#888888",
      background: "#ffffff",
      largeText: true,
    });
    expect(largePass?.requiredRatio).toBe(WCAG_AA_LARGE_MIN);
    expect(largePass?.passes).toBe(true);
  });

  it("binds foregroundParam / backgroundParam and skips invalid hex values without crashing", () => {
    const pairs = [
      {
        label: "Static headline",
        foreground: "#fafafa",
        background: "#111113",
        largeText: true,
      },
      {
        label: "Accent on card",
        foreground: "#38bdf8",
        background: "#111113",
        largeText: true,
        foregroundParam: "accentColor",
      },
    ];

    const darkAccent = evaluateTemplateContrast(pairs, {
      accentColor: "#18181b",
    });
    expect(darkAccent.declaredCount).toBe(2);
    expect(darkAccent.results).toHaveLength(2);
    expect(darkAccent.warnings).toHaveLength(1);
    expect(darkAccent.warnings[0]?.label).toBe("Accent on card");

    // Invalid hex in bound param skips that pair cleanly without throwing
    const invalidAccent = evaluateTemplateContrast(pairs, {
      accentColor: "not-a-hex",
    });
    expect(invalidAccent.declaredCount).toBe(2);
    expect(invalidAccent.results).toHaveLength(1);
    expect(invalidAccent.warnings).toEqual([]);
  });

  it("returns empty report when a template declares no colors", () => {
    expect(evaluateTemplateContrast(undefined, { title: "Hello" })).toEqual({
      declaredCount: 0,
      results: [],
      warnings: [],
    });
  });
});
