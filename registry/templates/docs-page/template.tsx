import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  siteName: z.string().min(1).max(40),
  section: z.string().min(1).max(56),
  title: z.string().min(1).max(90),
  summary: z.string().max(160).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #0369a1")
    .default("#0369a1"),
});

export default defineTemplate({
  id: "docs-page",
  name: "Docs Page",
  description:
    "Crisp light-mode documentation card with section breadcrumb, page title, and summary.",
  params,
  sample: {
    siteName: "Ogami Docs",
    section: "Guides / Script Safety",
    title: "Supported Scripts and Font Fallbacks",
    summary:
      "How Latin, Cyrillic, and opt-in Japanese fonts stay offline-safe with guarded fallback cards.",
    accentColor: "#0369a1",
  },
  render: (p, ctx) => {
    const fittedTitle = ctx.autoFit(p.title, {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 64,
      minFontSize: 32,
      lineHeight: 1.16,
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
          backgroundColor: "#f1f5f9",
          color: "#0f172a",
          fontFamily,
          padding: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: 18,
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
                gap: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                <svg width={26} height={26} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 5.5C4 4.39543 4.89543 3.5 6 3.5H11V19.5H6C4.89543 19.5 4 20.3954 4 21.5V5.5Z"
                    stroke={p.accentColor}
                    strokeWidth={1.8}
                  />
                  <path
                    d="M20 5.5C20 4.39543 19.1046 3.5 18 3.5H13V19.5H18C19.1046 19.5 20 20.3954 20 21.5V5.5Z"
                    stroke={p.accentColor}
                    strokeWidth={1.8}
                  />
                </svg>
                <span>{p.siteName}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 1,
                  overflow: "hidden",
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  color: p.accentColor,
                  fontSize: 19,
                  fontWeight: 700,
                }}
              >
                {p.section}
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
                  fontSize: fittedTitle.fontSize,
                  fontWeight: 700,
                  lineHeight: fittedTitle.lineHeight,
                  letterSpacing: "-0.025em",
                  color: "#0f172a",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {p.title}
              </div>

              {p.summary ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 28,
                    lineHeight: 1.42,
                    color: "#475569",
                    overflow: "hidden",
                  }}
                >
                  {p.summary}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #e2e8f0",
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
                DOCUMENTATION
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "#64748b",
                }}
              >
                {p.section}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
