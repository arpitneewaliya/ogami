import { describe, expect, it } from "vitest";
import {
  buildInitialFieldValues,
  buildMetadataSnippet,
  buildOgApiPath,
  extractPlaygroundFields,
  toTemplateParamsObject,
} from "../schema-form";

describe("playground JSON Schema form generator", () => {
  it("extracts typed fields including maxLength and falls back cleanly on unknown types", () => {
    const fields = extractPlaygroundFields({
      type: "object",
      required: ["title"],
      properties: {
        title: { type: "string", minLength: 1, maxLength: 80 },
        accentColor: {
          type: "string",
          maxLength: 7,
          pattern: "^#[0-9a-fA-F]{6}$",
          default: "#38bdf8",
        },
        stars: { type: "integer", minimum: 0, maximum: 999 },
        published: { type: "boolean", default: false },
        tags: { type: "array" },
      },
    });

    expect(fields.map((f) => [f.name, f.kind, f.maxLength])).toEqual([
      ["title", "text", 80],
      ["accentColor", "color", 7],
      ["stars", "number", undefined],
      ["published", "boolean", undefined],
      ["tags", "fallback", undefined],
    ]);

    const fallbackField = fields.find((f) => f.name === "tags");
    expect(fallbackField?.fallbackNote).toContain('type "array"');
  });

  it("builds initial values, coerces numbers, and generates /api/og URLs and snippets", () => {
    const fields = extractPlaygroundFields({
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", maxLength: 60 },
        stars: { type: "integer", minimum: 0 },
        featured: { type: "boolean", default: false },
      },
    });

    const initial = buildInitialFieldValues(fields, {
      name: "acme/ogami",
      stars: 42,
    });
    expect(initial).toEqual({
      name: "acme/ogami",
      stars: "42",
      featured: false,
    });

    const paramsObj = toTemplateParamsObject(fields, initial);
    expect(paramsObj).toEqual({
      name: "acme/ogami",
      stars: 42,
      featured: false,
    });

    const url = buildOgApiPath("github-repo", fields, initial);
    expect(url).toBe(
      "/api/og?template=github-repo&name=acme%2Fogami&stars=42&featured=false",
    );

    const snippet = buildMetadataSnippet(url, "GitHub Repo");
    expect(snippet).toContain("openGraph");
    expect(snippet).toContain("summary_large_image");
    expect(snippet).toContain(url);
  });
});
