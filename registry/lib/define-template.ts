import type { ReactElement } from "react";
import { z } from "zod";
import type { AutoFitOptions, AutoFitResult } from "./auto-fit";
import { findUnsupportedScripts, type LoadedFont, type ScriptId } from "./fonts";

export interface TemplateRenderContext {
  width: number;
  height: number;
  fonts: LoadedFont[];
  detectedScripts: ScriptId[];
  autoFit: (text: string, options: AutoFitOptions) => AutoFitResult;
}

export interface TemplateDefinition<TSchema extends z.ZodObject = z.ZodObject> {
  /** Unique kebab-case identifier matching the folder name under registry/templates/<id>. */
  id: string;
  /** Human-readable template name. */
  name: string;
  /** Short description of the card design. */
  description: string;
  /** Card width in pixels. Defaults to 1200. */
  width?: number;
  /** Card height in pixels. Defaults to 630. */
  height?: number;
  /** Zod object schema. Every string field must specify a finite .max(n) cap. */
  params: TSchema;
  /** Required sample input used by previews, gallery, playground, and CI. */
  sample: z.input<TSchema>;
  /** Pure render function returning Satori-compatible JSX (inline styles, flexbox only). */
  render: (params: z.infer<TSchema>, ctx: TemplateRenderContext) => ReactElement;
}

/**
 * Type-erased template view for heterogeneous template registries.
 * `params: never` preserves contravariance without resorting to `any`,
 * because callers validate inputs with `template.params` before rendering.
 */
export interface RegisteredTemplate {
  id: string;
  name: string;
  description: string;
  width?: number;
  height?: number;
  params: z.ZodObject;
  sample: Record<string, unknown>;
  render: (params: never, ctx: TemplateRenderContext) => ReactElement;
}

interface ZodLikeDef {
  type?: string;
  innerType?: unknown;
  element?: unknown;
}

interface ZodLikeNode {
  def?: ZodLikeDef;
  maxLength?: number | null;
  shape?: Record<string, unknown>;
}

const TEMPLATE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isZodLikeNode(value: unknown): value is ZodLikeNode {
  return typeof value === "object" && value !== null;
}

function unwrapSchema(schema: unknown): ZodLikeNode | null {
  let current: unknown = schema;
  const visited = new Set<unknown>();
  while (isZodLikeNode(current) && current.def?.innerType !== undefined) {
    if (visited.has(current)) break;
    visited.add(current);
    current = current.def.innerType;
  }
  return isZodLikeNode(current) ? current : null;
}

function assertFieldHasMaxLength(
  templateId: string,
  fieldPath: string,
  schema: unknown,
): void {
  const unwrapped = unwrapSchema(schema);
  if (!unwrapped?.def) return;

  const schemaType = unwrapped.def.type;

  if (schemaType === "string") {
    const maxLen = unwrapped.maxLength;
    if (typeof maxLen !== "number" || !Number.isFinite(maxLen) || maxLen <= 0) {
      throw new Error(
        `Template "${templateId}" string parameter "${fieldPath}" must declare a positive .max(n) length cap.`,
      );
    }
    return;
  }

  if (schemaType === "array" && unwrapped.def.element !== undefined) {
    assertFieldHasMaxLength(templateId, `${fieldPath}[]`, unwrapped.def.element);
    return;
  }

  if (schemaType === "object" && unwrapped.shape) {
    for (const [key, nested] of Object.entries(unwrapped.shape)) {
      assertFieldHasMaxLength(templateId, `${fieldPath}.${key}`, nested);
    }
  }
}

export function assertStringFieldsHaveMaxLength(
  templateId: string,
  schema: z.ZodObject,
): void {
  for (const [field, fieldSchema] of Object.entries(schema.shape)) {
    assertFieldHasMaxLength(templateId, field, fieldSchema);
  }
}

export function defineTemplate<TSchema extends z.ZodObject>(
  definition: TemplateDefinition<TSchema>,
): TemplateDefinition<TSchema> {
  if (!TEMPLATE_ID_PATTERN.test(definition.id)) {
    throw new Error(
      `Template id "${definition.id}" must be kebab-case (lowercase letters, digits, and hyphens).`,
    );
  }

  if (definition.name.trim().length === 0) {
    throw new Error(`Template "${definition.id}" must provide a non-empty name.`);
  }

  assertStringFieldsHaveMaxLength(definition.id, definition.params);

  const parsedSample = definition.params.safeParse(definition.sample);
  if (!parsedSample.success) {
    const firstIssue = parsedSample.error.issues[0];
    const detail = firstIssue
      ? `${firstIssue.path.join(".") || "sample"}: ${firstIssue.message}`
      : "invalid sample data";
    throw new Error(
      `Template "${definition.id}" has invalid sample data (${detail}).`,
    );
  }

  const sampleScriptIssues = findUnsupportedScripts(
    parsedSample.data as Record<string, unknown>,
  );
  if (sampleScriptIssues.length > 0) {
    const first = sampleScriptIssues[0];
    throw new Error(
      `Template "${definition.id}" sample field "${first.field}" uses unsupported script "${first.script}": ${first.reason}`,
    );
  }

  return definition;
}

export const RESERVED_QUERY_KEYS = [
  "template",
  "fallbackLabel",
  "emoji",
] as const;

export function coerceSearchParams(
  searchParams: URLSearchParams,
  schema: z.ZodObject,
  reservedKeys: readonly string[] = RESERVED_QUERY_KEYS,
): Record<string, unknown> {
  const reserved = new Set(reservedKeys);
  const shape = schema.shape as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, raw] of searchParams.entries()) {
    if (reserved.has(key)) continue;

    const fieldSchema = shape[key];
    const unwrapped = unwrapSchema(fieldSchema);
    const fieldType = unwrapped?.def?.type;

    if (fieldType === "number") {
      if (raw.trim() !== "") {
        const numeric = Number(raw);
        result[key] = Number.isFinite(numeric) ? numeric : raw;
      } else {
        result[key] = raw;
      }
      continue;
    }

    if (fieldType === "boolean") {
      if (raw === "true") {
        result[key] = true;
      } else if (raw === "false") {
        result[key] = false;
      } else {
        result[key] = raw;
      }
      continue;
    }

    result[key] = raw;
  }

  return result;
}

export function extractTemplateParamsFromSearchParams(
  searchParams: URLSearchParams,
  template: RegisteredTemplate,
  reservedKeys: readonly string[] = RESERVED_QUERY_KEYS,
): unknown {
  const reserved = new Set(reservedKeys);
  const hasTemplateParams = Array.from(searchParams.keys()).some(
    (key) => !reserved.has(key),
  );

  if (!hasTemplateParams) {
    return template.sample;
  }

  return coerceSearchParams(searchParams, template.params, reservedKeys);
}
