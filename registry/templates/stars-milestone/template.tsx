import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";
import {
  formatNumber,
  nonNegativeSafeIntParam,
  numberFormatParam,
} from "../../lib/format-number";

export const params = z.object({
  repo: z.string().min(1).max(60),
  stars: nonNegativeSafeIntParam,
  format: numberFormatParam,
  tagline: z
    .string()
    .max(120)
    .default("Thank you to everyone using and contributing to this project."),
  handle: z.string().max(40).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #fbbf24")
    .default("#fbbf24"),
});

export default defineTemplate({
  id: "stars-milestone",
  name: "Stars Milestone",
  description:
    "Repository star milestone card with compact or exact formatting and geometric star badge.",
  params,
  sample: {
    repo: "acme/ogami",
    stars: 10_000,
    format: "compact",
    tagline: "Thank you to every contributor, tester, and stargazer.",
    handle: "@acme-oss",
    accentColor: "#fbbf24",
  },
  render: (p, ctx) => {
    const formattedStars = formatNumber(p.stars, p.format);
    const fittedMetric = ctx.autoFit(formattedStars, {
      maxWidth: 680,
      maxLines: 1,
      maxFontSize: 108,
      minFontSize: 34,
      lineHeight: 1.05,
    });
    const fittedRepo = ctx.autoFit(p.repo, {
      maxWidth: 940,
      maxLines: 1,
      maxFontSize: 44,
      minFontSize: 26,
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
          backgroundColor: "#0f0d0a",
          color: "#fafaf9",
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
            backgroundColor: "#181410",
            border: "1px solid #352b1d",
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
                  backgroundColor: "#2b2112",
                  border: "1px solid #57411b",
                  color: "#fef3c7",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                <span>STARS MILESTONE</span>
              </div>

              {p.handle ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "#a8a29e",
                  }}
                >
                  {p.handle}
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
                    backgroundColor: "#2b2112",
                    border: "1px solid #57411b",
                    flexShrink: 0,
                  }}
                >
                  <svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2.5L14.9 8.4L21.4 9.3L16.7 13.9L17.8 20.4L12 17.3L6.2 20.4L7.3 13.9L2.6 9.3L9.1 8.4L12 2.5Z"
                      fill={p.accentColor}
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
                    {formattedStars}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 30,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      color: "#e7e5e4",
                    }}
                  >
                    STARS
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
                    fontSize: fittedRepo.fontSize,
                    fontWeight: 700,
                    lineHeight: fittedRepo.lineHeight,
                    color: "#fafaf9",
                    wordBreak: "break-word",
                    overflow: "hidden",
                  }}
                >
                  {p.repo}
                </div>

                {p.tagline ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 26,
                      lineHeight: 1.38,
                      color: "#d6d3d1",
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
                borderTop: "1px solid #352b1d",
                paddingTop: 22,
                fontSize: 20,
                color: "#a8a29e",
              }}
            >
              <span>Community Milestone</span>
              <span style={{ color: p.accentColor, fontWeight: 700 }}>
                {p.format === "exact" ? "EXACT COUNT" : "OPEN SOURCE"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
