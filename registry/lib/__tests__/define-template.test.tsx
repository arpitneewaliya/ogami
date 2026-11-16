import { describe, expect, it } from "vitest";
import { z } from "zod";
import { coerceSearchParams, defineTemplate } from "../define-template";

function dummyRender(params: { title: string }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      {params.title}
    </div>
  );
}

describe("defineTemplate", () => {
  it("accepts a valid template definition with length-capped string fields and neutral sample data", () => {
    const tpl = defineTemplate({
      id: "sample-card",
      name: "Sample Card",
      description: "Test template for unit validation.",
      params: z.object({
        title: z.string().min(1).max(80),
        author: z.string().max(50).default("Jane Doe"),
        domain: z.string().max(60).optional(),
        stars: z.number().int().nonnegative().optional(),
      }),
      sample: {
        title: "acme/my-project",
        author: "Jane Doe",
        domain: "example.com",
        stars: 1200,
      },
      render: (p) => dummyRender({ title: p.title }),
    });

    expect(tpl.id).toBe("sample-card");
    expect(tpl.sample.domain).toBe("example.com");
  });

  it("rejects non-kebab-case template ids", () => {
    expect(() =>
      defineTemplate({
        id: "SampleCard",
        name: "Bad ID",
        description: "Test",
        params: z.object({ title: z.string().max(40) }),
        sample: { title: "Hello" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/kebab-case/);
  });

  it("throws when any string parameter (including wrapped or nested fields) omits .max(n)", () => {
    expect(() =>
      defineTemplate({
        id: "uncapped-plain",
        name: "Uncapped Plain",
        description: "Test",
        params: z.object({ title: z.string() }),
        sample: { title: "Hello" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/\.max\(n\)/);

    expect(() =>
      defineTemplate({
        id: "uncapped-optional",
        name: "Uncapped Optional",
        description: "Test",
        params: z.object({
          title: z.string().max(40),
          subtitle: z.string().optional(),
        }),
        sample: { title: "Hello" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/subtitle.*\.max\(n\)/);

    expect(() =>
      defineTemplate({
        id: "uncapped-default",
        name: "Uncapped Default",
        description: "Test",
        params: z.object({
          title: z.string().max(40),
          author: z.string().default("Jane Doe"),
        }),
        sample: { title: "Hello" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/author.*\.max\(n\)/);

    expect(() =>
      defineTemplate({
        id: "uncapped-nullable",
        name: "Uncapped Nullable",
        description: "Test",
        params: z.object({
          title: z.string().max(40),
          tag: z.string().nullable(),
        }),
        sample: { title: "Hello", tag: null },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/tag.*\.max\(n\)/);
  });

  it("throws when sample data violates params or contains unsupported scripts/emoji", () => {
    expect(() =>
      defineTemplate({
        id: "invalid-sample-len",
        name: "Invalid Sample",
        description: "Test",
        params: z.object({ title: z.string().max(5) }),
        sample: { title: "Too long for max 5" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/invalid sample data/);

    expect(() =>
      defineTemplate({
        id: "invalid-sample-script",
        name: "Invalid Script Sample",
        description: "Test",
        params: z.object({ title: z.string().max(40) }),
        sample: { title: "Hello 🚀" },
        render: (p) => dummyRender(p),
      }),
    ).toThrow(/unsupported script "emoji"/);
  });
});

describe("coerceSearchParams", () => {
  const schema = z.object({
    title: z.string().max(60),
    stars: z.number().int().nonnegative().optional(),
    featured: z.boolean().default(false),
  });

  it("coerces numeric and boolean query strings while omitting reserved keys", () => {
    const sp = new URLSearchParams(
      "template=acme-card&fallbackLabel=example.com&title=acme%2Fmy-project&stars=1200&featured=true",
    );
    const coerced = coerceSearchParams(sp, schema);

    expect(coerced).toEqual({
      title: "acme/my-project",
      stars: 1200,
      featured: true,
    });
    expect(schema.safeParse(coerced).success).toBe(true);
  });

  it("leaves invalid numeric or boolean strings uncoerced so Zod reports validation issues", () => {
    const sp = new URLSearchParams("title=Hello&stars=not-a-number&featured=yes");
    const coerced = coerceSearchParams(sp, schema);

    expect(coerced).toEqual({
      title: "Hello",
      stars: "not-a-number",
      featured: "yes",
    });
    const parsed = schema.safeParse(coerced);
    expect(parsed.success).toBe(false);
  });
});
