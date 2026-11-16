import { ImageResponse } from "next/og";
import { z } from "zod";
import { autoFit } from "./auto-fit";
import type {
  RegisteredTemplate,
  TemplateDefinition,
  TemplateRenderContext,
} from "./define-template";
import {
  BASE_SUPPORTED_SCRIPTS,
  UnsupportedScriptError,
  detectScriptsInParams,
  findUnsupportedScripts,
  getJapaneseFontCmap,
  hasJapaneseFontPack,
  loadFontsForScripts,
  stripEmojiFromParams,
  stripEmojiFromText,
  type EmojiWarning,
  type ScriptId,
  type SupportedScript,
} from "./fonts";

export class TemplateValidationError extends Error {
  readonly code = "INVALID_PARAMS" as const;
  readonly templateId: string;
  readonly issues: readonly z.core.$ZodIssue[];

  constructor(templateId: string, issues: readonly z.core.$ZodIssue[]) {
    const summary = issues
      .map((issue) => `${issue.path.join(".") || "params"}: ${issue.message}`)
      .join("; ");
    super(`Invalid parameters for template "${templateId}": ${summary}`);
    this.name = "TemplateValidationError";
    this.templateId = templateId;
    this.issues = issues;
  }
}

export type EmojiMode = "strip" | "fallback";

export interface RenderTemplateOptions {
  /**
   * How to handle emoji characters in text parameters:
   * - "strip" (default): removes emoji graphemes before rendering and reports them in `warnings`.
   * - "fallback": treats emoji as unsupported so the guarded fallback / error path runs.
   */
  emoji?: EmojiMode;
  /**
   * Behavior when an unsupported script is detected:
   * - "fallback" (default): returns a safe Option 1 fallback card (HTTP 200, Cache-Control: no-store).
   * - "return-error": returns `{ ok: false, error: UnsupportedScriptError, warnings }`.
   * - "throw": throws UnsupportedScriptError.
   */
  onUnsupportedScript?: "fallback" | "return-error" | "throw";
  /**
   * Optional label (such as a site or product name) shown on the fallback card.
   * Defaults to `template.name`. Must use only base-supported scripts.
   */
  fallbackLabel?: string;
  /** Optional custom HTTP headers merged onto the normal ImageResponse. */
  headers?: Record<string, string>;
}

export type RenderTemplateResult =
  | {
      ok: true;
      isFallback: false;
      response: ImageResponse;
      detectedScripts: ScriptId[];
      warnings: EmojiWarning[];
    }
  | {
      ok: true;
      isFallback: true;
      response: ImageResponse;
      error: UnsupportedScriptError;
      detectedScripts: ScriptId[];
      warnings: EmojiWarning[];
    }
  | {
      ok: false;
      error: UnsupportedScriptError | TemplateValidationError;
      warnings: EmojiWarning[];
    };

export interface RenderFallbackCardOptions {
  templateId?: string;
  templateName?: string;
  fallbackLabel?: string;
  unsupportedScripts?: readonly ScriptId[];
  warnings?: readonly EmojiWarning[];
  width?: number;
  height?: number;
  headers?: Record<string, string>;
}

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 630;
const MAX_FALLBACK_LABEL_LENGTH = 60;

export const DEFAULT_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

function formatEmojiCodePoints(grapheme: string): string {
  return Array.from(grapheme)
    .map((ch) => {
      const cp = ch.codePointAt(0);
      return cp !== undefined ? `U+${cp.toString(16).toUpperCase()}` : "";
    })
    .filter(Boolean)
    .join("+");
}

export function formatWarningsHeader(
  warnings: readonly EmojiWarning[],
): string {
  return warnings
    .map((warning) => {
      const codes = warning.removed.map(formatEmojiCodePoints).join(", ");
      return `${warning.field}: stripped ${warning.removed.length} emoji (${codes})`;
    })
    .join("; ");
}

function sanitizeFallbackText(
  candidate: string | undefined,
): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  const { cleaned } = stripEmojiFromText(trimmed);
  if (!cleaned) return null;
  const issues = findUnsupportedScripts(
    { label: cleaned },
    { supportedScripts: BASE_SUPPORTED_SCRIPTS },
  );
  if (issues.length > 0) return null;
  return cleaned.length > MAX_FALLBACK_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_FALLBACK_LABEL_LENGTH - 3)}...`
    : cleaned;
}

function resolveFallbackLabel(options?: RenderFallbackCardOptions): string {
  return (
    sanitizeFallbackText(options?.fallbackLabel) ??
    sanitizeFallbackText(options?.templateName) ??
    "Preview"
  );
}

/**
 * Renders an Option 1 safe fallback card (HTTP 200, Cache-Control: no-store,
 * X-Ogami-Fallback: true, X-Ogami-Unsupported-Scripts) containing none of the
 * caller's unsupported text parameters.
 */
export async function renderFallbackCard(
  options?: RenderFallbackCardOptions,
): Promise<ImageResponse> {
  const width = options?.width ?? DEFAULT_WIDTH;
  const height = options?.height ?? DEFAULT_HEIGHT;
  const label = resolveFallbackLabel(options);
  const badgeText =
    sanitizeFallbackText(options?.templateId)?.toUpperCase() ?? "SAFE PREVIEW";
  const unsupportedScripts = options?.unsupportedScripts ?? [];
  const fonts = await loadFontsForScripts(["latin"]);
  const showDevNotice = process.env.NODE_ENV === "development";

  const headers = new Headers(options?.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-ogami-fallback", "true");
  headers.set("x-ogami-unsupported-scripts", unsupportedScripts.join(","));
  if (options?.warnings && options.warnings.length > 0) {
    headers.set("x-ogami-warnings", formatWarningsHeader(options.warnings));
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily: "Geist",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            border: "1px solid #27272a",
            borderRadius: 20,
            padding: 56,
            backgroundColor: "#111113",
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
                gap: 10,
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid #27272a",
                backgroundColor: "#18181b",
                fontSize: 20,
                color: "#a1a1aa",
                letterSpacing: "0.06em",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  backgroundColor: "#38bdf8",
                }}
              />
              <span>{badgeText}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 64,
                lineHeight: 1.15,
                color: "#fafafa",
              }}
            >
              {label}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid #27272a",
              paddingTop: 24,
              fontSize: 22,
              color: "#a1a1aa",
            }}
          >
            <span>
              {showDevNotice && unsupportedScripts.length > 0
                ? `Fallback card rendered: unsupported script (${unsupportedScripts.join(", ")})`
                : "Ogami"}
            </span>
            <div
              style={{
                display: "flex",
                width: 48,
                height: 6,
                borderRadius: 999,
                backgroundColor: "#38bdf8",
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts,
      status: 200,
      headers: Object.fromEntries(headers.entries()),
    },
  );
}

export async function renderTemplate<TSchema extends z.ZodObject>(
  template: TemplateDefinition<TSchema> | RegisteredTemplate,
  rawParams: unknown,
  options?: RenderTemplateOptions,
): Promise<RenderTemplateResult> {
  const parsed = template.params.safeParse(rawParams);
  if (!parsed.success) {
    return {
      ok: false,
      error: new TemplateValidationError(template.id, parsed.error.issues),
      warnings: [],
    };
  }

  const emojiMode: EmojiMode = options?.emoji ?? "strip";
  let activeParams = parsed.data;
  let warnings: EmojiWarning[] = [];

  if (emojiMode === "strip") {
    const stripped = stripEmojiFromParams(
      parsed.data as Record<string, unknown>,
    );
    activeParams = stripped.sanitized as z.infer<TSchema>;
    warnings = stripped.warnings;
  }

  const activeRecord = activeParams as Record<string, unknown>;
  const detectedScripts = detectScriptsInParams(activeRecord);

  // Only inspect NotoSansJP-Regular.ttf if the text actually contains Japanese characters,
  // ensuring Latin/Cyrillic requests never perform disk I/O on multi-MB font packs.
  let supported: readonly SupportedScript[] = BASE_SUPPORTED_SCRIPTS;
  let japaneseCmap: ReadonlySet<number> | undefined;

  if (detectedScripts.includes("japanese") && (await hasJapaneseFontPack())) {
    supported = ["latin", "cyrillic", "japanese"];
    japaneseCmap = (await getJapaneseFontCmap()) ?? undefined;
  }

  const issues = findUnsupportedScripts(activeRecord, {
    supportedScripts: supported,
    japaneseCmap,
  });

  if (issues.length > 0) {
    const error = new UnsupportedScriptError(issues);
    const behavior = options?.onUnsupportedScript ?? "fallback";

    if (behavior === "throw") {
      throw error;
    }

    if (behavior === "return-error") {
      return {
        ok: false,
        error,
        warnings,
      };
    }

    const response = await renderFallbackCard({
      templateId: template.id,
      templateName: template.name,
      fallbackLabel: options?.fallbackLabel,
      unsupportedScripts: error.scripts,
      warnings,
      width: template.width,
      height: template.height,
      headers: options?.headers,
    });

    return {
      ok: true,
      isFallback: true,
      response,
      error,
      detectedScripts,
      warnings,
    };
  }

  const width = template.width ?? DEFAULT_WIDTH;
  const height = template.height ?? DEFAULT_HEIGHT;
  const fonts = await loadFontsForScripts(detectedScripts);

  const ctx: TemplateRenderContext = {
    width,
    height,
    fonts,
    detectedScripts,
    autoFit,
  };

  const element = (template as RegisteredTemplate).render(
    activeParams as never,
    ctx,
  );

  const responseHeaders = new Headers(options?.headers);
  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("cache-control", DEFAULT_CACHE_CONTROL);
  }
  if (warnings.length > 0) {
    responseHeaders.set("x-ogami-warnings", formatWarningsHeader(warnings));
  }

  const response = new ImageResponse(element, {
    width,
    height,
    fonts,
    headers: Object.fromEntries(responseHeaders.entries()),
  });

  return {
    ok: true,
    isFallback: false,
    response,
    detectedScripts,
    warnings,
  };
}
