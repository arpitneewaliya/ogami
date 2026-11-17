import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  repo: z.string().min(1).max(60),
  tagline: z.string().min(1).max(140),
  badge: z.string().max(24).default("OPEN SOURCE"),
  language: z.string().max(24).default("TypeScript"),
  license: z.string().max(24).default("MIT"),
  handle: z.string().max(40).default(""),
  accentColor: z
    .string()
    .max(7)
    .regex(/^#[0-9a-fA-F]{6}$/, "Expected a 6-digit hex color like #10b981")
    .default("#10b981"),
});

export default defineTemplate({
  id: "repo-launch",
  name: "Repo Launch",
  description:
    "Open-source repository launch card with stack badge, license pill, and tagline.",
  params,
  sample: {
    repo: "acme/photon-og",
    tagline:
      "Declarative Open Graph image generation for Next.js with strict script and layout guardrails.",
    badge: "OPEN SOURCE",
    language: "TypeScript",
    license: "MIT",
    handle: "@acme-oss",
    accentColor: "#10b981",
  },
  render: (p, ctx) => {
    const fittedRepo = ctx.autoFit(p.repo, {
      maxWidth: 960,
      maxLines: 2,
      maxFontSize: 66,
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
          backgroundColor: "#07110e",
          color: "#f8fafc",
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
            backgroundColor: "#0c1a16",
            border: "1px solid #1e3a31",
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
              padding: "44px 56px",
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
                  gap: 12,
                  padding: "8px 18px",
                  borderRadius: 999,
                  backgroundColor: "#064e3b",
                  border: "1px solid #10b981",
                  color: "#ecfdf5",
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                <svg width={18} height={18} viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.5L10.2 5.8L14.5 8L10.2 10.2L8 14.5L5.8 10.2L1.5 8L5.8 5.8L8 1.5Z"
                    fill="#ecfdf5"
                  />
                </svg>
                <span>{p.badge || "OPEN SOURCE"}</span>
              </div>

              {p.license ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 16px",
                    borderRadius: 10,
                    border: "1px solid #1e3a31",
                    backgroundColor: "#11241e",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#cbd5e1",
                  }}
                >
                  {p.license}
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
                  fontSize: fittedRepo.fontSize,
                  fontWeight: 700,
                  lineHeight: fittedRepo.lineHeight,
                  letterSpacing: "-0.025em",
                  color: "#f8fafc",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {p.repo}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: "#cbd5e1",
                  overflow: "hidden",
                }}
              >
                {p.tagline}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #1e3a31",
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                }}
              >
                {p.language ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 22,
                      color: "#e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: p.accentColor,
                      }}
                    />
                    <span>{p.language}</span>
                  </div>
                ) : null}

                {p.handle ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      color: "#94a3b8",
                    }}
                  >
                    {p.handle}
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 20,
                  fontWeight: 700,
                  color: p.accentColor,
                  letterSpacing: "0.08em",
                }}
              >
                <span>NEW RELEASE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
