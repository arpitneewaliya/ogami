import Link from "next/link";
import type { ReactNode } from "react";
import { marked, type Token, type Tokens } from "marked";
import CopyButton from "@/app/_components/copy-button";

export interface DocFrontmatter {
  title: string;
  description: string;
  order: number;
}

export interface ParsedDocSource {
  frontmatter: DocFrontmatter;
  body: string;
}

/**
 * Splits leading `---` YAML-style frontmatter (`title`, `description`, `order`)
 * from a documentation Markdown file without adding extra YAML dependencies.
 */
export function parseDocFrontmatter(
  rawSource: string,
  slug: string,
): ParsedDocSource {
  const normalized = rawSource.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`Doc "${slug}" is missing required YAML frontmatter.`);
  }
  const endIdx = normalized.indexOf("\n---\n", 4);
  if (endIdx < 0) {
    throw new Error(`Doc "${slug}" has unterminated frontmatter.`);
  }

  const headerBlock = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 5).trim();

  let title = "";
  let description = "";
  let order = 999;

  for (const line of headerBlock.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const rawVal = line.slice(colonIdx + 1).trim();
    const unquoted =
      (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
      (rawVal.startsWith("'") && rawVal.endsWith("'"))
        ? rawVal.slice(1, -1)
        : rawVal;

    if (key === "title") title = unquoted;
    if (key === "description") description = unquoted;
    if (key === "order") {
      const parsed = Number(unquoted);
      if (Number.isFinite(parsed)) order = parsed;
    }
  }

  if (!title || !description) {
    throw new Error(
      `Doc "${slug}" frontmatter must define both title and description.`,
    );
  }

  return {
    frontmatter: { title, description, order },
    body,
  };
}

const CONTROL_AND_SPACE_RE = /[\u0000-\u0020\u007f]/g;

/**
 * Allows only relative URLs (not protocol-relative `//`), `http:`, `https:`, and `mailto:`.
 * Disallowed schemes (`javascript:`, `data:`, `vbscript:`, `file:`, etc.) return `null`.
 */
export function sanitizeLinkHref(rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed) return null;

  // Strip control bytes/whitespace before inspecting scheme (catches `java\nscript:`).
  const compact = trimmed.replace(CONTROL_AND_SPACE_RE, "");
  if (!compact) return null;

  if (compact.startsWith("//")) {
    return null;
  }

  if (
    compact.startsWith("/") ||
    compact.startsWith("./") ||
    compact.startsWith("../") ||
    compact.startsWith("#")
  ) {
    return trimmed;
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(compact)) {
    try {
      const parsed = new URL(compact);
      if (
        parsed.protocol === "http:" ||
        parsed.protocol === "https:" ||
        parsed.protocol === "mailto:"
      ) {
        return trimmed;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Relative path without leading slash (e.g. `fonts` or `page.html`).
  return trimmed;
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function isInternalHref(href: string): boolean {
  return href.startsWith("/") || href.startsWith("#");
}

const proseLinkClassName =
  "inline-flex min-h-11 min-w-11 max-w-full break-words items-center justify-center rounded-md px-1.5 font-medium text-accent underline decoration-accent/50 underline-offset-4 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

function renderInlineTokens(
  tokens: readonly Token[] | undefined,
  keyPrefix: string,
): ReactNode {
  if (!tokens || tokens.length === 0) return null;

  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;

    switch (token.type) {
      case "text": {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          return (
            <span key={key}>
              {renderInlineTokens(textToken.tokens, key)}
            </span>
          );
        }
        return textToken.text;
      }
      case "escape": {
        const escapeToken = token as Tokens.Escape;
        return escapeToken.text;
      }
      case "strong": {
        const strongToken = token as Tokens.Strong;
        return (
          <strong key={key} className="font-semibold text-foreground">
            {renderInlineTokens(strongToken.tokens, key)}
          </strong>
        );
      }
      case "em": {
        const emToken = token as Tokens.Em;
        return (
          <em key={key} className="italic text-foreground">
            {renderInlineTokens(emToken.tokens, key)}
          </em>
        );
      }
      case "del": {
        const delToken = token as Tokens.Del;
        return (
          <del key={key} className="text-muted">
            {renderInlineTokens(delToken.tokens, key)}
          </del>
        );
      }
      case "codespan": {
        const codeToken = token as Tokens.Codespan;
        return (
          <code
            key={key}
            className="break-words rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[0.875em] text-accent"
          >
            {codeToken.text}
          </code>
        );
      }
      case "br":
        return <br key={key} />;
      case "link": {
        const linkToken = token as Tokens.Link;
        const safeHref = sanitizeLinkHref(linkToken.href);
        const content = renderInlineTokens(linkToken.tokens, key);
        if (!safeHref) {
          return (
            <span key={key} className="text-foreground-secondary">
              {content}
            </span>
          );
        }
        if (isInternalHref(safeHref)) {
          return (
            <Link
              key={key}
              href={safeHref}
              title={linkToken.title ?? undefined}
              className={proseLinkClassName}
            >
              {content}
            </Link>
          );
        }
        return (
          <a
            key={key}
            href={safeHref}
            title={linkToken.title ?? undefined}
            target={safeHref.startsWith("mailto:") ? undefined : "_blank"}
            rel={
              safeHref.startsWith("mailto:") ? undefined : "noopener noreferrer"
            }
            className={proseLinkClassName}
          >
            {content}
          </a>
        );
      }
      case "image": {
        const imgToken = token as Tokens.Image;
        return <span key={key}>{imgToken.text || "[image]"}</span>;
      }
      case "html":
        // Raw HTML tokens are always dropped (never injected).
        return null;
      default:
        return token.raw;
    }
  });
}

function renderBlockTokens(
  tokens: readonly Token[],
  keyPrefix: string,
): ReactNode {
  return tokens.map((token, idx) => {
    const key = `${keyPrefix}-${idx}`;

    switch (token.type) {
      case "space":
      case "def":
        return null;
      case "html":
        // Raw HTML tokens are always dropped (never injected).
        return null;
      case "heading": {
        const headingToken = token as Tokens.Heading;
        const id = slugifyHeading(headingToken.text);
        const children = renderInlineTokens(headingToken.tokens, key);
        if (headingToken.depth === 1) {
          return (
            <h1
              key={key}
              id={id}
              className="mt-8 text-3xl font-bold tracking-tight text-foreground first:mt-0"
            >
              {children}
            </h1>
          );
        }
        if (headingToken.depth === 2) {
          return (
            <h2
              key={key}
              id={id}
              className="mt-10 border-b border-border pb-2 text-2xl font-semibold tracking-tight text-foreground first:mt-0"
            >
              {children}
            </h2>
          );
        }
        if (headingToken.depth === 3) {
          return (
            <h3
              key={key}
              id={id}
              className="mt-7 text-lg font-semibold text-foreground"
            >
              {children}
            </h3>
          );
        }
        return (
          <h4
            key={key}
            id={id}
            className="mt-5 text-base font-semibold text-foreground"
          >
            {children}
          </h4>
        );
      }
      case "paragraph": {
        const pToken = token as Tokens.Paragraph;
        return (
          <p
            key={key}
            className="mt-4 leading-7 text-foreground-secondary first:mt-0"
          >
            {renderInlineTokens(pToken.tokens, key)}
          </p>
        );
      }
      case "blockquote": {
        const quoteToken = token as Tokens.Blockquote;
        return (
          <blockquote
            key={key}
            className="mt-5 rounded-r-xl border-y border-r border-l-4 border-border border-l-accent bg-surface-muted px-4 py-3 text-sm text-foreground-secondary"
          >
            {renderBlockTokens(quoteToken.tokens, key)}
          </blockquote>
        );
      }
      case "code": {
        const codeToken = token as Tokens.Code;
        return (
          <div
            key={key}
            className="mt-5 overflow-hidden rounded-xl border border-border bg-surface-muted"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3.5 py-1.5">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                {codeToken.lang || "code"}
              </span>
              <CopyButton text={codeToken.text} label="Copy code" />
            </div>
            <pre className="max-w-full overflow-x-auto p-4 text-xs leading-6 text-foreground">
              <code className="block overflow-x-auto font-mono">
                {codeToken.text}
              </code>
            </pre>
          </div>
        );
      }
      case "list": {
        const listToken = token as Tokens.List;
        const ListTag = listToken.ordered ? "ol" : "ul";
        return (
          <ListTag
            key={key}
            className={`mt-4 space-y-2 pl-6 text-foreground-secondary ${
              listToken.ordered ? "list-decimal" : "list-disc"
            }`}
          >
            {listToken.items.map((item, itemIdx) => (
              <li key={`${key}-li-${itemIdx}`} className="leading-7">
                {renderBlockTokens(item.tokens, `${key}-li-${itemIdx}`)}
              </li>
            ))}
          </ListTag>
        );
      }
      case "text": {
        const textToken = token as Tokens.Text;
        if (textToken.tokens && textToken.tokens.length > 0) {
          return (
            <span key={key}>{renderInlineTokens(textToken.tokens, key)}</span>
          );
        }
        return <span key={key}>{textToken.text}</span>;
      }
      case "hr":
        return <hr key={key} className="my-8 border-border" />;
      case "table": {
        const tableToken = token as Tokens.Table;
        return (
          <div
            key={key}
            className="mt-6 max-w-full overflow-x-auto rounded-xl border border-border bg-surface"
          >
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted">
                <tr>
                  {tableToken.header.map((cell, cellIdx) => (
                    <th
                      key={`${key}-th-${cellIdx}`}
                      className="border-b border-border px-4 py-3 font-semibold"
                    >
                      {renderInlineTokens(cell.tokens, `${key}-th-${cellIdx}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface text-foreground-secondary">
                {tableToken.rows.map((row, rowIdx) => (
                  <tr key={`${key}-row-${rowIdx}`}>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={`${key}-td-${rowIdx}-${cellIdx}`}
                        className="px-4 py-3 align-top"
                      >
                        {renderInlineTokens(
                          cell.tokens,
                          `${key}-td-${rowIdx}-${cellIdx}`,
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      default:
        return null;
    }
  });
}

export function MarkdownArticle({ source }: { source: string }) {
  const tokens = marked.lexer(source, { gfm: true, breaks: false });
  return (
    <div className="max-w-none">{renderBlockTokens(tokens, "md")}</div>
  );
}

function collectLinksFromTokens(tokens: readonly Token[], out: string[]): void {
  for (const token of tokens) {
    if (token.type === "link") {
      out.push((token as Tokens.Link).href);
    }
    if (token.type === "list") {
      for (const item of (token as Tokens.List).items) {
        collectLinksFromTokens(item.tokens, out);
      }
    }
    if (token.type === "table") {
      const table = token as Tokens.Table;
      for (const cell of table.header) {
        collectLinksFromTokens(cell.tokens, out);
      }
      for (const row of table.rows) {
        for (const cell of row) {
          collectLinksFromTokens(cell.tokens, out);
        }
      }
    }
    if ("tokens" in token && Array.isArray(token.tokens)) {
      collectLinksFromTokens(token.tokens, out);
    }
  }
}

/**
 * Extracts all Markdown link targets using `marked.lexer` (used by doc link tests).
 */
export function extractMarkdownLinks(source: string): string[] {
  const tokens = marked.lexer(source, { gfm: true, breaks: false });
  const links: string[] = [];
  collectLinksFromTokens(tokens, links);
  return links;
}
