import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().max(140).default(""),
  tag: z.string().max(30).default(""),
  domain: z.string().max(50).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #38bdf8")
    .default("#38bdf8"),
});

export default defineTemplate({
  id: "minimal-tech",
  name: "Minimal Tech",
  description:
    "Clean dark-mode announcement card for developer tools, releases, and documentation.",
  params,
  sample: {
    title: "Shipping Faster with Declarative Edge-Free Previews",
    subtitle:
      "Zero-config social cards with strict parameter validation and script guardrails.",
    tag: "RELEASE v1.0",
    domain: "example.com",
    accentColor: "#38bdf8",
  },
  render: (p, ctx) => {
    const fittedTitle = ctx.autoFit(p.title, {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 68,
      minFontSize: 32,
      lineHeight: 1.15,
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
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily,
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#111113",
            border: "1px solid #27272a",
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
              padding: "46px 56px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 42,
              }}
            >
              {p.tag ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 18px",
                    borderRadius: 999,
                    border: "1px solid #27272a",
                    backgroundColor: "#18181b",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#e4e4e7",
                    letterSpacing: "0.08em",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: p.accentColor,
                    }}
                  />
                  <span>{p.tag}</span>
                </div>
              ) : (
                <div style={{ display: "flex" }} />
              )}
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
                  fontSize: fittedTitle.fontSize,
                  fontWeight: 700,
                  lineHeight: fittedTitle.lineHeight,
                  letterSpacing: "-0.02em",
                  color: "#fafafa",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {p.title}
              </div>

              {p.subtitle ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    lineHeight: 1.4,
                    color: "#a1a1aa",
                    overflow: "hidden",
                  }}
                >
                  {p.subtitle}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #27272a",
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "#a1a1aa",
                }}
              >
                {p.domain}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 10,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: p.accentColor,
                    opacity: 0.35,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: 20,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: p.accentColor,
                    opacity: 0.65,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    width: 36,
                    height: 6,
                    borderRadius: 999,
                    backgroundColor: p.accentColor,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
