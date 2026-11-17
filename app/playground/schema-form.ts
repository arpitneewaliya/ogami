export interface JsonSchemaProperty {
  type?: string | string[];
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: unknown;
  description?: string;
}

export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export type PlaygroundFieldKind =
  | "text"
  | "select"
  | "color"
  | "number"
  | "boolean"
  | "fallback";

export interface PlaygroundFieldDescriptor {
  name: string;
  label: string;
  kind: PlaygroundFieldKind;
  required: boolean;
  isInteger: boolean;
  options?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  defaultValue?: string | number | boolean;
  fallbackNote?: string;
}

function formatFieldLabel(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/^\w/, (ch) => ch.toUpperCase());
}

function isHexColorPattern(pattern: string | undefined): boolean {
  if (!pattern) return false;
  return pattern.includes("#") && pattern.toLowerCase().includes("0-9a-f");
}

function normalizeSchemaType(
  rawType: string | string[] | undefined,
): string | undefined {
  if (typeof rawType === "string") return rawType;
  if (Array.isArray(rawType)) {
    return rawType.find((t) => t !== "null") ?? rawType[0];
  }
  return undefined;
}

/**
 * Converts a Zod-generated JSON Schema object (`z.toJSONSchema`) into typed UI
 * field descriptors. Unrecognized types fall back to plain text input with a note.
 */
export function extractPlaygroundFields(
  schema: JsonSchemaObject,
): PlaygroundFieldDescriptor[] {
  const properties = schema.properties ?? {};
  const requiredSet = new Set(schema.required ?? []);
  const fields: PlaygroundFieldDescriptor[] = [];

  for (const [name, prop] of Object.entries(properties)) {
    const primaryType = normalizeSchemaType(prop.type);
    const label = formatFieldLabel(name);
    const required = requiredSet.has(name);

    if (primaryType === "string") {
      const enumOptions = Array.isArray(prop.enum)
        ? prop.enum.filter((v): v is string => typeof v === "string")
        : [];
      if (enumOptions.length > 0) {
        fields.push({
          name,
          label,
          kind: "select",
          required,
          isInteger: false,
          options: enumOptions,
          defaultValue:
            typeof prop.default === "string" ? prop.default : enumOptions[0],
        });
        continue;
      }

      const isColor = isHexColorPattern(prop.pattern);
      fields.push({
        name,
        label,
        kind: isColor ? "color" : "text",
        required,
        isInteger: false,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        pattern: prop.pattern,
        defaultValue: typeof prop.default === "string" ? prop.default : undefined,
      });
      continue;
    }

    if (primaryType === "integer" || primaryType === "number") {
      fields.push({
        name,
        label,
        kind: "number",
        required,
        isInteger: primaryType === "integer",
        minimum: prop.minimum,
        maximum: prop.maximum,
        defaultValue: typeof prop.default === "number" ? prop.default : undefined,
      });
      continue;
    }

    if (primaryType === "boolean") {
      fields.push({
        name,
        label,
        kind: "boolean",
        required,
        isInteger: false,
        defaultValue:
          typeof prop.default === "boolean" ? prop.default : undefined,
      });
      continue;
    }

    fields.push({
      name,
      label,
      kind: "fallback",
      required,
      isInteger: false,
      defaultValue:
        prop.default !== undefined ? String(prop.default) : undefined,
      fallbackNote: `Unsupported JSON Schema type "${primaryType ?? "unknown"}"; using plain text input.`,
    });
  }

  return fields;
}

export function buildInitialFieldValues(
  fields: readonly PlaygroundFieldDescriptor[],
  sample: Record<string, unknown>,
): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};

  for (const field of fields) {
    const raw =
      field.name in sample ? sample[field.name] : field.defaultValue;

    if (field.kind === "boolean") {
      values[field.name] = Boolean(raw);
    } else if (raw === undefined || raw === null) {
      values[field.name] = "";
    } else {
      values[field.name] = String(raw);
    }
  }

  return values;
}

export function toTemplateParamsObject(
  fields: readonly PlaygroundFieldDescriptor[],
  values: Record<string, string | boolean>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = values[field.name];
    if (field.kind === "boolean") {
      out[field.name] = Boolean(raw);
      continue;
    }

    const strVal = typeof raw === "string" ? raw : "";
    if (field.kind === "number") {
      if (strVal.trim() === "") {
        if (field.required) {
          out[field.name] = "";
        }
        continue;
      }
      const num = Number(strVal);
      out[field.name] = Number.isFinite(num) ? num : strVal;
      continue;
    }

    if (strVal === "" && !field.required && field.defaultValue === undefined) {
      continue;
    }
    out[field.name] = strVal;
  }

  return out;
}

export function buildOgApiPath(
  templateId: string,
  fields: readonly PlaygroundFieldDescriptor[],
  values: Record<string, string | boolean>,
): string {
  const params = new URLSearchParams();
  params.set("template", templateId);

  for (const field of fields) {
    const raw = values[field.name];
    if (field.kind === "boolean") {
      params.set(field.name, String(Boolean(raw)));
      continue;
    }

    const strVal = typeof raw === "string" ? raw : "";
    if (field.kind === "number" && strVal.trim() === "") {
      continue;
    }
    if (strVal === "" && !field.required && field.defaultValue === undefined) {
      continue;
    }
    params.set(field.name, strVal);
  }

  return `/api/og?${params.toString()}`;
}

export function buildMetadataSnippet(ogPath: string, title: string): string {
  return [
    'import type { Metadata } from "next";',
    "",
    "export const metadata: Metadata = {",
    `  title: ${JSON.stringify(title)},`,
    "  openGraph: {",
    `    images: [{ url: ${JSON.stringify(ogPath)}, width: 1200, height: 630 }],`,
    "  },",
    "  twitter: {",
    '    card: "summary_large_image",',
    `    images: [${JSON.stringify(ogPath)}],`,
    "  },",
    "};",
  ].join("\n");
}
