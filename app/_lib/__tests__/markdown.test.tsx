import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  extractMarkdownLinks,
  MarkdownArticle,
  parseDocFrontmatter,
  sanitizeLinkHref,
} from "../markdown";

describe("markdown token-to-JSX renderer", () => {
  it("drops raw HTML blocks and inline HTML tags instead of injecting them", () => {
    const md = [
      "## Safe Heading",
      "",
      "<script>window.__xss = true;</script>",
      "",
      'Paragraph with <img src="x" onerror="alert(1)" /> and <b>inline html</b>.',
    ].join("\n");

    const html = renderToStaticMarkup(<MarkdownArticle source={md} />);

    expect(html).toContain("Safe Heading");
    expect(html).toContain("Paragraph with");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<b>");
  });

  it("allows only http, https, mailto, and safe relative links", () => {
    expect(sanitizeLinkHref("https://ogami.example.com/r/core.json")).toBe(
      "https://ogami.example.com/r/core.json",
    );
    expect(sanitizeLinkHref("http://localhost:3000/playground")).toBe(
      "http://localhost:3000/playground",
    );
    expect(sanitizeLinkHref("mailto:hello@example.com")).toBe(
      "mailto:hello@example.com",
    );
    expect(sanitizeLinkHref("/docs/quick-start")).toBe("/docs/quick-start");
    expect(sanitizeLinkHref("#supported-scripts")).toBe("#supported-scripts");

    expect(sanitizeLinkHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("java\nscript:alert(1)")).toBeNull();
    expect(sanitizeLinkHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(sanitizeLinkHref("vbscript:msgbox(1)")).toBeNull();
    expect(sanitizeLinkHref("file:///etc/passwd")).toBeNull();
    expect(sanitizeLinkHref("//evil.example/phish")).toBeNull();

    const md = [
      "- [Safe Docs](/docs/fonts)",
      "- [Safe HTTPS](https://nextjs.org)",
      "- [Mail](mailto:team@example.com)",
      "- [Bad JS](javascript:alert(1))",
      "- [Bad Data](data:text/html,hi)",
      "- [Bad ProtoRel](//evil.example)",
    ].join("\n");

    const html = renderToStaticMarkup(<MarkdownArticle source={md} />);
    expect(html).toContain('href="/docs/fonts"');
    expect(html).toContain('href="https://nextjs.org"');
    expect(html).toContain('href="mailto:team@example.com"');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("//evil.example");
    expect(html).toContain("Bad JS");
  });

  it("extracts links via marked AST and parses frontmatter cleanly", () => {
    const raw = [
      "---",
      'title: "Quick Start"',
      'description: "Install a template in one command."',
      "order: 1",
      "---",
      "",
      "Read [Fonts](/docs/fonts) or [Playground](/playground).",
    ].join("\n");

    const parsed = parseDocFrontmatter(raw, "quick-start");
    expect(parsed.frontmatter).toEqual({
      title: "Quick Start",
      description: "Install a template in one command.",
      order: 1,
    });
    expect(extractMarkdownLinks(parsed.body)).toEqual([
      "/docs/fonts",
      "/playground",
    ]);
  });

  it("renders fenced code blocks with language header, copy button, scrollable pre, and break-words inline code", () => {
    const md = [
      "Use `npm run build` first.",
      "",
      "```bash",
      "npx shadcn@latest add https://ogami-toolkit.vercel.app/r/github-repo.json",
      "```",
    ].join("\n");

    const html = renderToStaticMarkup(<MarkdownArticle source={md} />);
    expect(html).toContain("break-words");
    expect(html).toContain("bash");
    expect(html).toContain("Copy code");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("min-h-11");
  });
});
