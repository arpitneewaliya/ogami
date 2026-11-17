export interface PlatformCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
  topTrimPx: number;
  bottomTrimPx: number;
  leftTrimPx: number;
  rightTrimPx: number;
}

export interface PlatformOverlaySpec {
  id: string;
  name: string;
  /** Documented target aspect ratio [width, height], e.g. [1.91, 1] or [2, 1]. */
  aspectRatio: readonly [number, number];
  aspectRatioLabel: string;
  recommendedSize?: {
    width: number;
    height: number;
  };
  verified: boolean;
  /** Official documentation URL (or archived official URL when noted). */
  sourceUrl?: string;
  /** ISO date (YYYY-MM-DD) when this entry was last checked against official docs. */
  lastVerified: string;
  note: string;
}

export interface UndocumentedPlatformNotice {
  id: string;
  name: string;
  checkedDate: string;
  sourceUrl: string;
  statusLabel: string;
  note: string;
}

export const PLATFORM_OVERLAYS: readonly PlatformOverlaySpec[] = [
  {
    id: "linkedin",
    name: "LinkedIn",
    aspectRatio: [1.91, 1],
    aspectRatioLabel: "1.91:1",
    recommendedSize: { width: 1200, height: 627 },
    verified: true,
    sourceUrl: "https://www.linkedin.com/help/linkedin/answer/a521928",
    lastVerified: "2026-11-17",
    note: "Minimum 1200x627 px at 1.91:1 recommended ratio for link previews; images < 401 px wide render as a thumbnail.",
  },
  {
    id: "facebook",
    name: "Facebook (Meta)",
    aspectRatio: [1.91, 1],
    aspectRatioLabel: "1.91:1",
    recommendedSize: { width: 1080, height: 565 },
    verified: true,
    sourceUrl:
      "https://developers.facebook.com/documentation/sharing/best-practices#images",
    lastVerified: "2026-11-17",
    note: "Recommends >= 1080 px width for high-res displays and 1.91:1 rectangular ratio (1:1 for link ads / Game OG Stories).",
  },
  {
    id: "discord",
    name: "Discord",
    aspectRatio: [1200, 630],
    aspectRatioLabel: "1.91:1 (aspect-preserving)",
    recommendedSize: { width: 1200, height: 630 },
    verified: true,
    sourceUrl: "https://docs.discord.com/developers/link-previews/overview",
    lastVerified: "2026-11-17",
    note: "Quick Start uses 1200x630 with twitter:card=summary_large_image. Scales preserving aspect ratio; no fixed crop is documented.",
  },
  {
    id: "x",
    name: "X (summary_large_image)",
    aspectRatio: [2, 1],
    aspectRatioLabel: "2:1",
    recommendedSize: { width: 1200, height: 600 },
    verified: false,
    sourceUrl:
      "https://web.archive.org/web/20260204074639/https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image",
    lastVerified: "2026-11-17",
    note: "Live official X Cards documentation was removed during migration to docs.x.com (redirects to /overview). Values come from the archived 2026-02-04 developer.x.com snapshot (2:1 aspect ratio, min 300x157, max 4096x4096, <5MB).",
  },
] as const;

export const UNDOCUMENTED_PLATFORMS: readonly UndocumentedPlatformNotice[] = [
  {
    id: "slack",
    name: "Slack",
    checkedDate: "2026-11-17",
    sourceUrl:
      "https://docs.slack.dev/messaging/unfurling-links-in-messages#classic_unfurl",
    statusLabel: "No official crop spec (checked 2026-11-17)",
    note: "Classic unfurling reads Open Graph and Twitter Card tags, but Slack docs do not publish image dimensions or crop ratios.",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    checkedDate: "2026-11-17",
    sourceUrl: "https://faq.whatsapp.com/1164151087857729",
    statusLabel: "No official crop spec (checked 2026-11-17)",
    note: "WhatsApp official documentation does not publish og:image dimensions, file-size limits, or crop ratios.",
  },
] as const;

/**
 * Computes the centered crop rectangle when a canvas of size
 * `canvasWidth x canvasHeight` is center-cropped to `aspectRatio`.
 */
export function computePlatformCropRect(
  canvasWidth: number,
  canvasHeight: number,
  aspectRatio: readonly [number, number],
): PlatformCropRect {
  const [rw, rh] = aspectRatio;
  const targetRatio = rw / rh;
  const sourceRatio = canvasWidth / canvasHeight;

  let width = canvasWidth;
  let height = canvasHeight;

  if (Math.abs(sourceRatio - targetRatio) > 1e-6) {
    if (targetRatio > sourceRatio) {
      width = canvasWidth;
      height = canvasWidth / targetRatio;
    } else {
      height = canvasHeight;
      width = canvasHeight * targetRatio;
    }
  }

  const x = (canvasWidth - width) / 2;
  const y = (canvasHeight - height) / 2;

  return {
    x,
    y,
    width,
    height,
    topTrimPx: y,
    bottomTrimPx: canvasHeight - (y + height),
    leftTrimPx: x,
    rightTrimPx: canvasWidth - (x + width),
  };
}
