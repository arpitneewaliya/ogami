import { z } from "zod";
import { defineTemplate } from "../../lib/define-template";

export const params = z.object({
  title: z.string().min(1).max(100),
  author: z.string().min(1).max(50),
  date: z.string().max(30).default(""),
  readTime: z.string().max(24).default(""),
  category: z.string().max(32).optional(),
});

export default defineTemplate({
  id: "blog-post",
  name: "Blog Post",
  description:
    "Warm editorial card for articles, essays, and technical blog posts.",
  params,
  sample: {
    title: "Designing Resilient Rendering Pipelines for Modern Web Applications",
    author: "Jane Doe",
    date: "Nov 16, 2026",
    readTime: "6 min read",
    category: "Architecture",
  },
  render: (p, ctx) => {
    const fittedTitle = ctx.autoFit(p.title, {
      maxWidth: 940,
      maxLines: 3,
      maxFontSize: 64,
      minFontSize: 34,
      lineHeight: 1.16,
    });
    const fontFamily = Array.from(new Set(ctx.fonts.map((f) => f.name))).join(
      ", ",
    );
    const initial = p.author.trim().charAt(0).toUpperCase() || "A";

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          backgroundColor: "#faf8f5",
          color: "#18181b",
          fontFamily,
          padding: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #e7e5e4",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 14,
              height: "100%",
              backgroundColor: "#ea580c",
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
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {p.category ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 18px",
                    borderRadius: 999,
                    backgroundColor: "#fff7ed",
                    border: "1px solid #fed7aa",
                    color: "#c2410c",
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                  }}
                >
                  {p.category.toUpperCase()}
                </div>
              ) : (
                <div style={{ display: "flex" }} />
              )}

              {p.readTime ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "#78716c",
                  }}
                >
                  {p.readTime}
                </div>
              ) : null}
            </div>

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
                  fontSize: fittedTitle.fontSize,
                  fontWeight: 700,
                  lineHeight: fittedTitle.lineHeight,
                  letterSpacing: "-0.025em",
                  color: "#18181b",
                  wordBreak: "break-word",
                  overflow: "hidden",
                }}
              >
                {p.title}
              </div>

              <div
                style={{
                  display: "flex",
                  width: 84,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: "#ea580c",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #e7e5e4",
                paddingTop: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 48,
                    height: 48,
                    borderRadius: 999,
                    backgroundColor: "#18181b",
                    color: "#faf8f5",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {initial}
                </div>

                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#18181b",
                  }}
                >
                  {p.author}
                </div>
              </div>

              {p.date ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 22,
                    color: "#78716c",
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
