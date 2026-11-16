import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(140).default(""),
  language: z.string().max(24).default(""),
  stars: z.number().int().nonnegative().max(999_999_999).optional(),
  forks: z.number().int().nonnegative().max(999_999_999).optional(),
});

const LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  typescript: "#3178c6",
  javascript: "#f1e05a",
  rust: "#dea584",
  go: "#00add8",
  python: "#3572a5",
  html: "#e34c26",
  css: "#563d7c",
};

function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language.trim().toLowerCase()] ?? "#38bdf8";
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default defineTemplate({
  id: "github-repo",
  name: "GitHub Repo",
  description:
    "Repository card with inline repo, star, and fork icons and language indicator.",
  params,
  sample: {
    name: "acme/my-project",
    description:
      "A fast, type-safe toolkit for generating social preview cards in Next.js.",
    language: "TypeScript",
    stars: 1200,
    forks: 84,
  },
  render: (p, ctx) => {
    const fittedName = ctx.autoFit(p.name, {
      maxWidth: 900,
      maxLines: 2,
      maxFontSize: 62,
      minFontSize: 30,
      lineHeight: 1.15,
    });
    const fontFamily = Array.from(new Set(ctx.fonts.map((f) => f.name))).join(
      ", ",
    );
    const langColor = getLanguageColor(p.language);

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#0d1117",
          color: "#f0f6fc",
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
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 4,
              backgroundColor: "#38bdf8",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              padding: "48px 56px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 20,
                  overflow: "hidden",
                }}
              >
                <svg
                  width={44}
                  height={44}
                  viewBox="0 0 16 16"
                  fill="#8b949e"
                  style={{ flexShrink: 0, marginTop: 8 }}
                >
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                </svg>

                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    minWidth: 0,
                    fontSize: fittedName.fontSize,
                    fontWeight: 700,
                    lineHeight: fittedName.lineHeight,
                    color: "#f0f6fc",
                    letterSpacing: "-0.02em",
                    wordBreak: "break-word",
                    overflow: "hidden",
                  }}
                >
                  {p.name}
                </div>
              </div>

              {p.description ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    lineHeight: 1.4,
                    color: "#8b949e",
                    overflow: "hidden",
                  }}
                >
                  {p.description}
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #30363d",
                paddingTop: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 36,
                }}
              >
                {p.language ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 24,
                      color: "#c9d1d9",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        backgroundColor: langColor,
                      }}
                    />
                    <span>{p.language}</span>
                  </div>
                ) : null}

                {p.stars !== undefined ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 24,
                      color: "#c9d1d9",
                    }}
                  >
                    <svg width={24} height={24} viewBox="0 0 16 16" fill="#e3b341">
                      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                    </svg>
                    <span>{formatCount(p.stars)}</span>
                  </div>
                ) : null}

                {p.forks !== undefined ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontSize: 24,
                      color: "#c9d1d9",
                    }}
                  >
                    <svg width={24} height={24} viewBox="0 0 16 16" fill="#8b949e">
                      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
                    </svg>
                    <span>{formatCount(p.forks)}</span>
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 20,
                  color: "#8b949e",
                  letterSpacing: "0.06em",
                }}
              >
                REPOSITORY
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
});
