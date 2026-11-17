import { describe, expect, it } from "vitest";
import {
  PLATFORM_OVERLAYS,
  UNDOCUMENTED_PLATFORMS,
  computePlatformCropRect,
} from "../platforms";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe("platform crop/safe-area overlay metadata", () => {
  it("requires valid sourceUrl and ISO lastVerified for verified entries, and explanatory note for unverified entries", () => {
    expect(PLATFORM_OVERLAYS.length).toBeGreaterThan(0);

    for (const platform of PLATFORM_OVERLAYS) {
      expect(ISO_DATE_RE.test(platform.lastVerified)).toBe(true);
      expect(Number.isNaN(Date.parse(platform.lastVerified))).toBe(false);

      if (platform.verified) {
        expect(platform.sourceUrl).toBeDefined();
        expect(() => new URL(platform.sourceUrl ?? "")).not.toThrow();
      } else {
        expect(platform.note.trim().length).toBeGreaterThan(10);
      }

      if (platform.sourceUrl) {
        expect(() => new URL(platform.sourceUrl ?? "")).not.toThrow();
      }
    }

    for (const notice of UNDOCUMENTED_PLATFORMS) {
      expect(ISO_DATE_RE.test(notice.checkedDate)).toBe(true);
      expect(() => new URL(notice.sourceUrl)).not.toThrow();
      expect(notice.statusLabel).toContain(notice.checkedDate);
    }
  });

  it("computes accurate crop rectangles on a 1200x630 canvas", () => {
    const xCrop = computePlatformCropRect(1200, 630, [2, 1]);
    expect(xCrop).toEqual({
      x: 0,
      y: 15,
      width: 1200,
      height: 600,
      topTrimPx: 15,
      bottomTrimPx: 15,
      leftTrimPx: 0,
      rightTrimPx: 0,
    });

    const discordCrop = computePlatformCropRect(1200, 630, [1200, 630]);
    expect(discordCrop).toEqual({
      x: 0,
      y: 0,
      width: 1200,
      height: 630,
      topTrimPx: 0,
      bottomTrimPx: 0,
      leftTrimPx: 0,
      rightTrimPx: 0,
    });

    const linkedinCrop = computePlatformCropRect(1200, 630, [1.91, 1]);
    expect(linkedinCrop.width).toBe(1200);
    expect(linkedinCrop.height).toBeCloseTo(1200 / 1.91, 4);
    expect(linkedinCrop.topTrimPx).toBeCloseTo(
      (630 - 1200 / 1.91) / 2,
      4,
    );
  });
});
