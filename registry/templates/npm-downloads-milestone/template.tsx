import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";
import {
  formatNumber,
  nonNegativeSafeIntParam,
  numberFormatParam,
} from "../../lib/format-number";

export const params = z.object({
  packageName: z.string().min(1).max(60),
  downloads: nonNegativeSafeIntParam,
  format: numberFormatParam,
  period: z.string().max(32).default("Last 30 days"),
  tagline: z
    .string()
    .max(120)
    .default("Installed across production web apps and developer tooling."),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #fb7185")
    .default("#fb7185"),
});

export default defineTemplate({
  id: "npm-downloads-milestone",
  name: "npm Downloads Milestone",
  description:
    "Package download milestone card with compact or exact counter and original cube icon.",
  params,
  sample: {
    packageName: "@acme/og-toolkit",
    downloads: 1_250_000,
    format: "compact",
    period: "Last 30 days",
    tagline:
      "Powering automated Open Graph cards across modern TypeScript projects.",
    accentColor: "#fb7185",
  },
  render: (p, ctx) => {
    const formattedDownloads = formatNumber(p.downloads, p.format);
    const fittedMetric = ctx.autoFit(formattedDownloads, {
      maxWidth: 640,
      maxLines: 1,
      maxFontSize: 108,
      minFontSize: 34,
      lineHeight: 1.05,
    });
    const fittedPackage = ctx.autoFit(p.packageName, {
      maxWidth: 940,
      maxLines: 1,
      maxFontSize: 42,
      minFontSize: 24,
      lineHeight: 1.2,
    });
    const fontFamily = Array.from(new Set(ctx.fonts.map((f) => f.name))).join(
      ", ",
    );

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#110b0d",
          color: "#fff1f2",
          fontFamily,
          padding: 46,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#1b1216",
            border: "1px solid #3f222c",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 6,
              backgroundColor: p.accentColor,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "42px 56px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: "#311722",
                  border: "1px solid #6b273d",
                  color: "#ffe4e6",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                <span>PACKAGE DOWNLOADS</span>
              </div>

              {p.period ? (
                <div
                  style={{
                    display: "flex",
                    padding: "8px 16px",
                    borderRadius: 10,
                    backgroundColor: "#26181e",
                    border: "1px solid #3f222c",
                    fontSize: 19,
                    color: "#e4e4e7",
                  }}
                >
                  {p.period}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 88,
                    height: 88,
                    borderRadius: 20,
                    backgroundColor: "#311722",
                    border: "1px solid #6b273d",
                    flexShrink: 0,
                  }}
                >
                  <svg width={46} height={46} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2.5L20 7V17L12 21.5L4 17V7L12 2.5Z"
                      stroke={p.accentColor}
                      strokeWidth={1.8}
                    />
                    <path
                      d="M12 8V15.5M12 15.5L8.75 12.25M12 15.5L15.25 12.25"
                      stroke={p.accentColor}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: fittedMetric.fontSize,
                      fontWeight: 700,
                      lineHeight: fittedMetric.lineHeight,
                      letterSpacing: "-0.03em",
                      color: p.accentColor,
                    }}
                  >
                    {formattedDownloads}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 28,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "#f4f4f5",
                    }}
                  >
                    DOWNLOADS
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: fittedPackage.fontSize,
                    fontWeight: 700,
                    lineHeight: fittedPackage.lineHeight,
                    color: "#fff1f2",
                    wordBreak: "break-word",
                    overflow: "hidden",
                  }}
                >
                  {p.packageName}
                </div>

                {p.tagline ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 26,
                      lineHeight: 1.38,
                      color: "#d4d4d8",
                      overflow: "hidden",
                    }}
                  >
                    {p.tagline}
                  </div>
                ) : null}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #3f222c",
                paddingTop: 22,
                fontSize: 20,
                color: "#a1a1aa",
              }}
            >
              <span>npm Registry Metric</span>
              <span style={{ color: p.accentColor, fontWeight: 700 }}>
                {p.period || "MILESTONE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
