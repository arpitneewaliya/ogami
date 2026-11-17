import { z } from "zod";
import type { RegisteredTemplate } from "@/registry/lib/define-template";
import type { JsonSchemaObject, JsonSchemaProperty } from "@/app/playground/schema-form";

export interface TemplateParamRow {
  name: string;
  type: string;
  required: boolean;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  defaultValue?: string;
}

function formatPropertyType(prop: JsonSchemaProperty): string {
  const enumVals = Array.isArray(prop.enum)
    ? prop.enum.filter((v): v is string => typeof v === "string")
    : [];
  if (enumVals.length > 0) {
    return enumVals.map((v) => `"${v}"`).join(" | ");
  }

  if (typeof prop.type === "string") {
    return prop.type;
  }
  if (Array.isArray(prop.type)) {
    return prop.type.filter((t) => t !== "null").join(" | ") || "unknown";
  }
  return "unknown";
}

function formatDefaultValue(val: unknown): string | undefined {
  if (val === undefined) return undefined;
  if (typeof val === "string") {
    return val === "" ? '""' : JSON.stringify(val);
  }
  if (typeof val === "number" || typeof val === "boolean") {
    return String(val);
  }
  return JSON.stringify(val);
}

/**
 * Generates parameter documentation rows directly from a template's Zod 4
 * schema via `z.toJSONSchema` (matching `/playground` introspection).
 */
export function extractTemplateParamTable(
  template: RegisteredTemplate,
): TemplateParamRow[] {
  const jsonSchema = z.toJSONSchema(template.params, {
    io: "input",
    unrepresentable: "any",
  }) as JsonSchemaObject;

  const properties = jsonSchema.properties ?? {};
  const requiredSet = new Set(jsonSchema.required ?? []);

  return Object.entries(properties).map(([name, prop]) => ({
    name,
    type: formatPropertyType(prop),
    required: requiredSet.has(name),
    maxLength: typeof prop.maxLength === "number" ? prop.maxLength : undefined,
    minimum: typeof prop.minimum === "number" ? prop.minimum : undefined,
    maximum: typeof prop.maximum === "number" ? prop.maximum : undefined,
    defaultValue: formatDefaultValue(prop.default),
  }));
}
