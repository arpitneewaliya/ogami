import type { NextRequest } from "next/server";
import { extractTemplateParamsFromSearchParams } from "@/registry/lib/define-template";
import {
  TemplateValidationError,
  renderTemplate,
  type EmojiMode,
} from "@/registry/lib/render";
import { getTemplateById, templateIds } from "@/registry/templates";

function jsonError(
  body: Record<string, unknown>,
  status: number,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest): Promise<Response> {
  // Read request properties before entering try/catch so Next.js Cache Components
  // can detect dynamic request access cleanly during prerender analysis.
  const searchParams = request.nextUrl.searchParams;

  const templateId = searchParams.get("template")?.trim() ?? "";
  if (!templateId) {
    return jsonError(
      {
        error: 'Missing required query parameter "template".',
        availableTemplates: templateIds,
      },
      400,
    );
  }

  const template = getTemplateById(templateId);
  if (!template) {
    return jsonError(
      {
        error: `Unknown template "${templateId}".`,
        availableTemplates: templateIds,
      },
      404,
    );
  }

  try {
    const rawParams = extractTemplateParamsFromSearchParams(
      searchParams,
      template,
    );
    const fallbackLabel = searchParams.get("fallbackLabel") ?? undefined;
    const emojiParam = searchParams.get("emoji");
    const emojiMode: EmojiMode =
      emojiParam === "fallback" ? "fallback" : "strip";

    const result = await renderTemplate(template, rawParams, {
      emoji: emojiMode,
      fallbackLabel,
    });

    if (!result.ok) {
      if (result.error instanceof TemplateValidationError) {
        return jsonError(
          {
            error: "Invalid template parameters.",
            template: template.id,
            issues: result.error.issues.map((issue) => ({
              field: issue.path.join(".") || "params",
              message: issue.message,
            })),
          },
          400,
        );
      }

      return jsonError(
        {
          error: result.error.message,
          template: template.id,
        },
        400,
      );
    }

    return result.response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse request parameters.";
    return jsonError(
      {
        error: message,
        template: template.id,
      },
      400,
    );
  }
}
