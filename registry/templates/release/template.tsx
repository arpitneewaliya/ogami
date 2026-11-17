import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  project: z.string().min(1).max(48),
  version: z.string().min(1).max(24),
  headline: z.string().min(1).max(110),
  highlight1: z.string().max(72).default(""),
  highlight2: z.string().max(72).default(""),
  date: z.string().max(24).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #818cf8")
    .default("#818cf8"),
});

export default defineTemplate({
  id: "release",
  name: "Release",
  description:
    "Version announcement card with semver pill, release headline, and key highlights.",
  params,
  sample: {
    project: "Ogami Toolkit",
    version: "v2.4.0",
    headline:
      "Faster static font caching, contrast diagnostics, and five new social templates",
    highlight1: "Compact & exact milestone counters with safe integer bounds",
    highlight2: "Deterministic 1200x630 PNG pipeline with strict script fallback",
    date: "Nov 17, 2026",
    accentColor: "#818cf8",
  },
  render: (p, ctx) => {
    const fittedHeadline = ctx.autoFit(p.headline, {
      maxWidth: 940,
      maxLines: 2,
      maxFontSize: 54,
      minFontSize: 26,
      lineHeight: 1.18,
    });
    const fontFamily = Array.from(new Set(ctx.fonts.map((f) => f.name))).join(
      ", ",
    );
    const highlights = [p.highlight1, p.highlight2].filter(
      (item) => item.trim().length > 0,
    );

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0a0b14",
          color: "#f8fafc",
          fontFamily,
          padding: 46,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#121426",
            border: "1px solid #262b4d",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 12,
              height: "100%",
              backgroundColor: p.accentColor,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "44px 54px",
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
                  gap: 14,
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#e2e8f0",
                }}
              >
                <svg width={26} height={26} viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2.5 3.5C2.5 2.67157 3.17157 2 4 2H7.58579C7.98361 2 8.36514 2.15804 8.64645 2.43934L13.5607 7.35355C14.1464 7.93934 14.1464 8.88909 13.5607 9.47487L9.47487 13.5607C8.88909 14.1464 7.93934 14.1464 7.35355 13.5607L2.43934 8.64645C2.15804 8.36514 2 7.98361 2 7.58579V4C2 3.72386 2.22386 3.5 2.5 3.5Z"
                    stroke={p.accentColor}
                    strokeWidth={1.6}
                  />
                  <circle cx={5.5} cy={5.5} r={1.25} fill={p.accentColor} />
                </svg>
                <span>{p.project}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 22px",
                  borderRadius: 999,
                  backgroundColor: p.accentColor,
                  color: "#0a0b14",
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                {p.version}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 22,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: fittedHeadline.fontSize,
                  fontWeight: 700,
                  lineHeight: fittedHeadline.lineHeight,
                  letterSpacing: "-0.025em",
                  color: "#f8fafc",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {p.headline}
              </div>

              {highlights.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {highlights.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 22,
                        color: "#c7d2fe",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: p.accentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #262b4d",
                paddingTop: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 19,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: p.accentColor,
                }}
              >
                RELEASE NOTES
              </div>

              {p.date ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 21,
                    color: "#94a3b8",
                  }}
                >
                  {p.date}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  },
});
