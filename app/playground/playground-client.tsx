"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "@/app/_components/site-header";
import {
  evaluateTemplateContrast,
  parseHexColor,
  type ContrastColorPair,
} from "@/registry/lib/contrast";
import {
  PLATFORM_OVERLAYS,
  UNDOCUMENTED_PLATFORMS,
  computePlatformCropRect,
} from "@/registry/lib/platforms";
import {
  BASE_SUPPORTED_SCRIPTS,
  detectScriptsInParams,
  findUnsupportedScripts,
  stripEmojiFromParams,
  type SupportedScript,
} from "@/registry/lib/scripts";
import {
  buildInitialFieldValues,
  buildMetadataSnippet,
  buildOgApiPath,
  extractPlaygroundFields,
  toTemplateParamsObject,
  type JsonSchemaObject,
} from "./schema-form";

export interface PlaygroundTemplateDescriptor {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  sample: Record<string, unknown>;
  jsonSchema: JsonSchemaObject;
  colors?: ContrastColorPair[];
}

interface PlaygroundClientProps {
  templates: PlaygroundTemplateDescriptor[];
  supportedScripts: readonly SupportedScript[];
}

interface PreviewErrorState {
  status: number;
  message: string;
  issues: Array<{ field: string; message: string }>;
}

interface PreviewMeta {
  isFallback: boolean;
  unsupportedScripts: string;
  warnings: string;
}

const PREVIEW_DEBOUNCE_MS = 260;

const FOCUS_RING_CLASSES =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const FIELD_INPUT_CLASSES = `min-h-11 w-full rounded-lg border border-border-strong bg-background px-3 py-2 text-sm text-foreground transition ${FOCUS_RING_CLASSES}`;

export default function PlaygroundClient({
  templates,
  supportedScripts,
}: PlaygroundClientProps) {
  const searchParams = useSearchParams();
  const initialTemplateId = useMemo(() => {
    const requested = searchParams.get("template");
    if (requested && templates.some((t) => t.id === requested)) {
      return requested;
    }
    return templates[0]?.id ?? "";
  }, [searchParams, templates]);

  const [selectedTemplateId, setSelectedTemplateId] =
    useState<string>(initialTemplateId);

  const selectedTemplate = useMemo(
    () =>
      templates.find((t) => t.id === selectedTemplateId) ?? templates[0],
    [templates, selectedTemplateId],
  );

  const fields = useMemo(
    () =>
      selectedTemplate
        ? extractPlaygroundFields(selectedTemplate.jsonSchema)
        : [],
    [selectedTemplate],
  );

  const [valuesByTemplate, setValuesByTemplate] = useState<
    Record<string, Record<string, string | boolean>>
  >(() => {
    const initial: Record<string, Record<string, string | boolean>> = {};
    for (const tpl of templates) {
      const tplFields = extractPlaygroundFields(tpl.jsonSchema);
      initial[tpl.id] = buildInitialFieldValues(tplFields, tpl.sample);
    }
    return initial;
  });

  const activeValues = useMemo(() => {
    if (!selectedTemplate) return {};
    return (
      valuesByTemplate[selectedTemplate.id] ??
      buildInitialFieldValues(fields, selectedTemplate.sample)
    );
  }, [fields, selectedTemplate, valuesByTemplate]);

  const [selectedOverlayId, setSelectedOverlayId] = useState<string>("none");
  const [mobilePane, setMobilePane] = useState<"edit" | "preview">("edit");
  const [copiedTarget, setCopiedTarget] = useState<"url" | "snippet" | null>(
    null,
  );

  const paramObject = useMemo(
    () => toTemplateParamsObject(fields, activeValues),
    [fields, activeValues],
  );

  const ogApiPath = useMemo(
    () =>
      selectedTemplate
        ? buildOgApiPath(selectedTemplate.id, fields, activeValues)
        : "/api/og",
    [activeValues, fields, selectedTemplate],
  );

  const [debouncedOgPath, setDebouncedOgPath] = useState<string>(ogApiPath);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [loadedOgPath, setLoadedOgPath] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<PreviewErrorState | null>(
    null,
  );
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta>({
    isFallback: false,
    unsupportedScripts: "",
    warnings: "",
  });

  const previewLoading = loadedOgPath !== debouncedOgPath;

  const activeObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedOgPath(ogApiPath);
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [ogApiPath]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPreview(): Promise<void> {
      try {
        const response = await fetch(debouncedOgPath, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!response.ok) {
          let message = `Failed to render preview (HTTP ${response.status}).`;
          let issues: Array<{ field: string; message: string }> = [];
          try {
            const payload = (await response.json()) as {
              error?: string;
              issues?: Array<{ field: string; message: string }>;
            };
            if (payload.error) message = payload.error;
            if (Array.isArray(payload.issues)) issues = payload.issues;
          } catch {
            // Non-JSON error body; keep status summary.
          }

          if (!controller.signal.aborted) {
            setPreviewError({ status: response.status, message, issues });
            setLoadedOgPath(debouncedOgPath);
          }
          return;
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const nextUrl = URL.createObjectURL(blob);
        const previousUrl = activeObjectUrlRef.current;
        activeObjectUrlRef.current = nextUrl;
        setPreviewObjectUrl(nextUrl);
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }

        setPreviewMeta({
          isFallback: response.headers.get("x-ogami-fallback") === "true",
          unsupportedScripts:
            response.headers.get("x-ogami-unsupported-scripts") ?? "",
          warnings: response.headers.get("x-ogami-warnings") ?? "",
        });
        setPreviewError(null);
        setLoadedOgPath(debouncedOgPath);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof Error ? error.message : "Network error fetching card.";
        setPreviewError({ status: 0, message, issues: [] });
        setLoadedOgPath(debouncedOgPath);
      }
    }

    void loadPreview();

    return () => {
      controller.abort();
    };
  }, [debouncedOgPath]);

  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    if (typeof window !== "undefined") {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("template", templateId);
      window.history.replaceState(null, "", nextUrl.toString());
    }
  }, []);

  const handleFieldChange = useCallback(
    (fieldName: string, value: string | boolean) => {
      if (!selectedTemplate) return;
      setValuesByTemplate((prev) => ({
        ...prev,
        [selectedTemplate.id]: {
          ...(prev[selectedTemplate.id] ??
            buildInitialFieldValues(fields, selectedTemplate.sample)),
          [fieldName]: value,
        },
      }));
    },
    [fields, selectedTemplate],
  );

  const handleResetSample = useCallback(() => {
    if (!selectedTemplate) return;
    setValuesByTemplate((prev) => ({
      ...prev,
      [selectedTemplate.id]: buildInitialFieldValues(
        fields,
        selectedTemplate.sample,
      ),
    }));
  }, [fields, selectedTemplate]);

  const scriptAnalysis = useMemo(() => {
    const detected = detectScriptsInParams(paramObject);
    const hasEmoji = detected.includes("emoji");
    const { sanitized, warnings: emojiWarnings } =
      stripEmojiFromParams(paramObject);
    const unsupportedIssues = findUnsupportedScripts(sanitized, {
      supportedScripts:
        supportedScripts.length > 0
          ? supportedScripts
          : BASE_SUPPORTED_SCRIPTS,
    });
    return {
      hasEmoji,
      emojiWarnings,
      unsupportedIssues,
    };
  }, [paramObject, supportedScripts]);

  const contrastReport = useMemo(
    () => evaluateTemplateContrast(selectedTemplate?.colors, paramObject),
    [paramObject, selectedTemplate?.colors],
  );

  const selectedPlatform = useMemo(
    () => PLATFORM_OVERLAYS.find((p) => p.id === selectedOverlayId) ?? null,
    [selectedOverlayId],
  );

  const cropRect = useMemo(() => {
    if (!selectedPlatform || !selectedTemplate) return null;
    return computePlatformCropRect(
      selectedTemplate.width,
      selectedTemplate.height,
      selectedPlatform.aspectRatio,
    );
  }, [selectedPlatform, selectedTemplate]);

  const handleCopy = useCallback(
    async (kind: "url" | "snippet") => {
      if (!selectedTemplate) return;
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = `${origin}${ogApiPath}`;
      const text =
        kind === "url"
          ? fullUrl
          : buildMetadataSnippet(ogApiPath, selectedTemplate.name);
      try {
        await navigator.clipboard.writeText(text);
        setCopiedTarget(kind);
        window.setTimeout(() => {
          setCopiedTarget((curr) => (curr === kind ? null : curr));
        }, 1800);
      } catch {
        // Ignore clipboard errors in restricted contexts.
      }
    },
    [ogApiPath, selectedTemplate],
  );

  if (!selectedTemplate) {
    return (
      <div className="min-w-0 flex-1 bg-background text-foreground">
        <SiteHeader active="playground" />
        <main className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted sm:px-6">
          No templates registered.
        </main>
      </div>
    );
  }

  const hasEditAlert = scriptAnalysis.unsupportedIssues.length > 0;
  const hasPreviewAlert =
    previewMeta.isFallback || contrastReport.warnings.length > 0;

  return (
    <div className="min-w-0 flex-1 bg-background text-foreground">
      <SiteHeader active="playground" />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Playground
          </h1>
          <p className="text-xs text-muted">
            Edit template parameters, inspect platform crop overlays, and audit
            declared contrast pairs.
          </p>
        </div>

        {/* Mobile controls (< lg): compact template select + Edit / Preview switch */}
        <div className="mb-6 rounded-xl border border-border bg-surface p-3 lg:hidden">
          <label
            htmlFor="mobile-template-select"
            className="block text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Template
          </label>
          <div className="mt-2 flex items-center gap-2">
            <select
              id="mobile-template-select"
              value={selectedTemplate.id}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className={`min-h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-background px-3 py-2 text-sm font-medium text-foreground ${FOCUS_RING_CLASSES}`}
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.id})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleResetSample}
              className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent ${FOCUS_RING_CLASSES}`}
            >
              Load sample
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            {selectedTemplate.description}
          </p>

          <div
            role="group"
            aria-label="Playground view mode"
            className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-muted p-1"
          >
            <button
              type="button"
              aria-pressed={mobilePane === "edit"}
              onClick={() => setMobilePane("edit")}
              className={`inline-flex min-h-11 min-w-11 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${FOCUS_RING_CLASSES} ${
                mobilePane === "edit"
                  ? "bg-accent-strong text-accent-foreground shadow-sm"
                  : "bg-surface text-foreground-secondary hover:text-foreground"
              }`}
            >
              <span>Edit Parameters ({fields.length})</span>
              {hasEditAlert ? (
                <span className="rounded border border-status-warn-border bg-status-warn-subtle px-1.5 py-0.5 text-[10px] font-semibold text-status-warn">
                  {scriptAnalysis.unsupportedIssues.length}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-pressed={mobilePane === "preview"}
              onClick={() => setMobilePane("preview")}
              className={`inline-flex min-h-11 min-w-11 flex-wrap items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${FOCUS_RING_CLASSES} ${
                mobilePane === "preview"
                  ? "bg-accent-strong text-accent-foreground shadow-sm"
                  : "bg-surface text-foreground-secondary hover:text-foreground"
              }`}
            >
              <span>Live Preview</span>
              {hasPreviewAlert ? (
                <span className="rounded border border-status-warn-border bg-status-warn-subtle px-1.5 py-0.5 text-[10px] font-semibold text-status-warn">
                  Warn
                </span>
              ) : null}
            </button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Left panel: template picker, zod-generated form, script warnings */}
          <section
            className={`${
              mobilePane === "edit" ? "flex" : "hidden"
            } min-w-0 flex-col gap-6 lg:flex`}
          >
            <div className="hidden rounded-xl border border-border bg-surface p-4 lg:block">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Template
                </h2>
                <button
                  type="button"
                  onClick={handleResetSample}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-strong bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent ${FOCUS_RING_CLASSES}`}
                >
                  Load sample
                </button>
              </div>
              <div className="grid gap-2">
                {templates.map((tpl) => {
                  const isActive = tpl.id === selectedTemplate.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      className={`min-h-11 min-w-11 rounded-lg border p-3 text-left transition ${FOCUS_RING_CLASSES} ${
                        isActive
                          ? "border-accent bg-accent-subtle text-foreground"
                          : "border-border bg-background text-foreground-secondary hover:border-border-strong hover:bg-surface-muted hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{tpl.name}</span>
                        <code className="font-mono text-[11px] text-muted">
                          {tpl.id}
                        </code>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {tpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Parameters (Zod JSON Schema)
                </h2>
                <button
                  type="button"
                  onClick={() => setMobilePane("preview")}
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-strong bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent hover:text-accent lg:hidden ${FOCUS_RING_CLASSES}`}
                >
                  View preview →
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {fields.map((field) => {
                  const val = activeValues[field.name];
                  const strVal = typeof val === "string" ? val : "";

                  if (field.kind === "boolean") {
                    return (
                      <label
                        key={field.name}
                        htmlFor={`field-${field.name}`}
                        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg border border-border-strong bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:border-accent"
                      >
                        <span>
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 font-semibold text-status-warn">
                              *
                            </span>
                          ) : null}
                        </span>
                        <input
                          id={`field-${field.name}`}
                          type="checkbox"
                          checked={Boolean(val)}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.checked)
                          }
                          className={`h-6 w-6 min-h-11 min-w-11 shrink-0 cursor-pointer accent-accent ${FOCUS_RING_CLASSES}`}
                        />
                      </label>
                    );
                  }

                  if (field.kind === "select" && field.options) {
                    return (
                      <div key={field.name} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`field-${field.name}`}
                          className="text-xs font-medium text-foreground-secondary"
                        >
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 font-semibold text-status-warn">
                              *
                            </span>
                          ) : null}
                        </label>
                        <select
                          id={`field-${field.name}`}
                          value={strVal}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          className={FIELD_INPUT_CLASSES}
                        >
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.kind === "color") {
                    const isValidHex = parseHexColor(strVal) !== null;
                    const pickerValue = isValidHex ? strVal : "#38bdf8";
                    return (
                      <div key={field.name} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <label
                            htmlFor={`field-${field.name}`}
                            className="font-medium text-foreground-secondary"
                          >
                            {field.label}
                            {field.required ? (
                              <span className="ml-1 font-semibold text-status-warn">
                                *
                              </span>
                            ) : null}
                          </label>
                          {field.maxLength ? (
                            <span className="font-mono text-muted">
                              {strVal.length}/{field.maxLength}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={`${field.label} color picker`}
                            value={pickerValue}
                            onChange={(e) =>
                              handleFieldChange(field.name, e.target.value)
                            }
                            className={`h-11 w-11 min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg border border-border-strong bg-background p-1 ${FOCUS_RING_CLASSES}`}
                          />
                          <input
                            id={`field-${field.name}`}
                            type="text"
                            value={strVal}
                            maxLength={field.maxLength}
                            onChange={(e) =>
                              handleFieldChange(field.name, e.target.value)
                            }
                            className={`min-h-11 min-w-0 flex-1 rounded-lg border border-border-strong bg-background px-3 py-2 font-mono text-sm text-foreground transition ${FOCUS_RING_CLASSES}`}
                          />
                        </div>
                      </div>
                    );
                  }

                  if (field.kind === "number") {
                    return (
                      <div key={field.name} className="flex flex-col gap-1.5">
                        <label
                          htmlFor={`field-${field.name}`}
                          className="text-xs font-medium text-foreground-secondary"
                        >
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 font-semibold text-status-warn">
                              *
                            </span>
                          ) : null}
                        </label>
                        <input
                          id={`field-${field.name}`}
                          type="number"
                          value={strVal}
                          min={field.minimum}
                          max={field.maximum}
                          step={field.isInteger ? 1 : "any"}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          className={FIELD_INPUT_CLASSES}
                        />
                      </div>
                    );
                  }

                  const useTextarea =
                    field.kind === "text" &&
                    field.maxLength !== undefined &&
                    field.maxLength >= 90;

                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`field-${field.name}`}
                          className="font-medium text-foreground-secondary"
                        >
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 font-semibold text-status-warn">
                              *
                            </span>
                          ) : null}
                        </label>
                        {field.maxLength ? (
                          <span className="font-mono text-muted">
                            {strVal.length}/{field.maxLength}
                          </span>
                        ) : null}
                      </div>
                      {useTextarea ? (
                        <textarea
                          id={`field-${field.name}`}
                          rows={3}
                          value={strVal}
                          maxLength={field.maxLength}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          className={FIELD_INPUT_CLASSES}
                        />
                      ) : (
                        <input
                          id={`field-${field.name}`}
                          type="text"
                          value={strVal}
                          maxLength={field.maxLength}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          className={FIELD_INPUT_CLASSES}
                        />
                      )}
                      {field.fallbackNote ? (
                        <p className="text-[11px] font-medium text-status-warn">
                          {field.fallbackNote}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Script safety & emoji guardrails */}
            {scriptAnalysis.unsupportedIssues.length > 0 ? (
              <div
                role="alert"
                className="rounded-xl border border-status-warn-border bg-status-warn-subtle/40 p-4 text-xs text-foreground"
              >
                <div className="font-semibold text-status-warn">
                  Unsupported script detected
                </div>
                <ul className="mt-2 flex flex-col gap-1.5 text-foreground-secondary">
                  {scriptAnalysis.unsupportedIssues.map((issue) => (
                    <li key={`${issue.field}-${issue.script}`}>
                      <span className="font-mono font-semibold text-foreground">
                        {issue.field}
                      </span>{" "}
                      ({issue.script}, e.g. &ldquo;{issue.sampleChar}&rdquo;):{" "}
                      {issue.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {scriptAnalysis.hasEmoji ? (
              <div className="rounded-xl border border-status-warn-border bg-status-warn-subtle/40 p-4 text-xs text-foreground">
                <div className="font-semibold text-status-warn">
                  Emoji detected (stripped by default)
                </div>
                <p className="mt-1 text-foreground-secondary">
                  <code className="break-words font-mono text-foreground">
                    next/og
                  </code>{" "}
                  triggers external Twemoji CDN requests when rendering emoji,
                  so{" "}
                  <code className="break-words font-mono text-foreground">
                    /api/og
                  </code>{" "}
                  strips them by default to stay offline-safe.
                </p>
                <ul className="mt-1.5 flex flex-col gap-1 text-foreground-secondary">
                  {scriptAnalysis.emojiWarnings.map((w) => (
                    <li key={w.field}>
                      <span className="font-mono text-foreground">
                        {w.field}
                      </span>
                      : {w.removed.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* Right panel: live preview, platform overlays, contrast, copy controls */}
          <section
            className={`${
              mobilePane === "preview" ? "flex" : "hidden"
            } min-w-0 flex-col gap-6 lg:flex`}
          >
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Live Preview
                  </h2>
                  {previewLoading ? (
                    <span className="rounded-md border border-border bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-foreground-secondary">
                      Rendering...
                    </span>
                  ) : null}
                  {previewMeta.isFallback ? (
                    <span className="rounded-md border border-status-warn-border bg-status-warn-subtle px-2.5 py-0.5 text-[11px] font-semibold text-status-warn">
                      Fallback card ({previewMeta.unsupportedScripts || "guarded"}
                      )
                    </span>
                  ) : null}
                </div>

                <div
                  role="group"
                  aria-label="Platform crop overlays"
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <button
                    type="button"
                    aria-pressed={selectedOverlayId === "none"}
                    onClick={() => setSelectedOverlayId("none")}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition ${FOCUS_RING_CLASSES} ${
                      selectedOverlayId === "none"
                        ? "border-accent bg-accent-subtle font-semibold text-accent"
                        : "border-border-strong bg-background text-foreground-secondary hover:border-accent hover:text-foreground"
                    }`}
                  >
                    None
                  </button>
                  {PLATFORM_OVERLAYS.map((platform) => {
                    const isActive = selectedOverlayId === platform.id;
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => setSelectedOverlayId(platform.id)}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-3 py-2 text-xs font-medium transition ${FOCUS_RING_CLASSES} ${
                          isActive
                            ? platform.verified
                              ? "border-accent bg-accent-subtle font-semibold text-accent"
                              : "border-dashed border-status-warn bg-status-warn-subtle font-semibold text-status-warn"
                            : "border-border-strong bg-background text-foreground-secondary hover:border-accent hover:text-foreground"
                        }`}
                      >
                        {platform.name}
                        {!platform.verified ? " (Unverified)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {previewError ? (
                <div
                  role="alert"
                  className="flex aspect-[1200/630] w-full flex-col justify-center rounded-lg border border-status-warn-border bg-status-warn-subtle/40 p-6 text-sm text-foreground"
                >
                  <div className="font-semibold text-status-warn">
                    {previewError.message}
                  </div>
                  {previewError.issues.length > 0 ? (
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-foreground-secondary">
                      {previewError.issues.map((issue, idx) => (
                        <li key={`${issue.field}-${idx}`}>
                          <span className="font-mono font-semibold text-foreground">
                            {issue.field}
                          </span>
                          : {issue.message}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg border border-border-strong bg-surface-muted">
                  {previewObjectUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Renders dynamic blob URL fetched from /api/og
                    <img
                      src={previewObjectUrl}
                      alt={`${selectedTemplate.name} live preview`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted">
                      Loading preview...
                    </div>
                  )}

                  {selectedPlatform && cropRect ? (
                    <div className="pointer-events-none absolute inset-0">
                      {cropRect.topTrimPx > 0 ? (
                        <>
                          <div
                            className="absolute inset-x-0 top-0 bg-black/55"
                            style={{
                              height: `${(cropRect.topTrimPx / selectedTemplate.height) * 100}%`,
                            }}
                          />
                          <div
                            className="absolute inset-x-0 bottom-0 bg-black/55"
                            style={{
                              height: `${(cropRect.bottomTrimPx / selectedTemplate.height) * 100}%`,
                            }}
                          />
                        </>
                      ) : null}
                      {cropRect.leftTrimPx > 0 ? (
                        <>
                          <div
                            className="absolute inset-y-0 left-0 bg-black/55"
                            style={{
                              width: `${(cropRect.leftTrimPx / selectedTemplate.width) * 100}%`,
                            }}
                          />
                          <div
                            className="absolute inset-y-0 right-0 bg-black/55"
                            style={{
                              width: `${(cropRect.rightTrimPx / selectedTemplate.width) * 100}%`,
                            }}
                          />
                        </>
                      ) : null}
                      <div
                        className={`absolute ${
                          selectedPlatform.verified
                            ? "border-2 border-solid border-accent"
                            : "border-2 border-dashed border-status-warn"
                        }`}
                        style={{
                          left: `${(cropRect.x / selectedTemplate.width) * 100}%`,
                          top: `${(cropRect.y / selectedTemplate.height) * 100}%`,
                          width: `${(cropRect.width / selectedTemplate.width) * 100}%`,
                          height: `${(cropRect.height / selectedTemplate.height) * 100}%`,
                        }}
                      >
                        <div className="inline-flex items-center gap-1.5 border border-border-strong bg-surface/95 px-2 py-0.5 text-[11px] font-medium text-foreground">
                          <span>
                            {selectedPlatform.name} ·{" "}
                            {selectedPlatform.aspectRatioLabel}
                          </span>
                          {!selectedPlatform.verified ? (
                            <span className="rounded border border-status-warn-border bg-status-warn-subtle px-1 font-semibold uppercase text-status-warn">
                              Unverified
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {previewMeta.warnings ? (
                <p className="mt-2 break-words text-xs font-medium text-status-warn">
                  Route header{" "}
                  <code className="break-words font-mono text-foreground">
                    X-Ogami-Warnings
                  </code>
                  : {previewMeta.warnings}
                </p>
              ) : null}

              {selectedPlatform ? (
                <div className="mt-3 rounded-lg border border-border bg-background p-3 text-xs text-foreground-secondary">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {selectedPlatform.name} ({selectedPlatform.aspectRatioLabel})
                      {!selectedPlatform.verified ? " — Unverified" : ""}
                    </span>
                    <span className="text-muted">
                      Last checked: {selectedPlatform.lastVerified}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{selectedPlatform.note}</p>
                  {selectedPlatform.sourceUrl ? (
                    <a
                      href={selectedPlatform.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 inline-flex min-h-11 min-w-11 items-center rounded-md px-2 text-xs font-semibold text-accent underline underline-offset-4 transition hover:text-foreground ${FOCUS_RING_CLASSES}`}
                    >
                      Source documentation
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
                <span className="font-medium text-foreground-secondary">
                  Omitted from overlays:
                </span>
                {UNDOCUMENTED_PLATFORMS.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex flex-wrap items-center gap-1"
                  >
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md px-2 font-medium text-accent underline underline-offset-4 transition hover:text-foreground ${FOCUS_RING_CLASSES}`}
                    >
                      {item.name}
                    </a>
                    <span>: {item.statusLabel}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* WCAG Contrast panel */}
              <div className="min-w-0 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Contrast Audit (WCAG AA)
                  </h2>
                  {contrastReport.warnings.length > 0 ? (
                    <span className="rounded-md border border-status-warn-border bg-status-warn-subtle px-2 py-0.5 text-[11px] font-semibold text-status-warn">
                      {contrastReport.warnings.length} warning
                      {contrastReport.warnings.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Checks declared color pairs in{" "}
                  <code className="break-words font-mono text-foreground">
                    meta.json
                  </code>{" "}
                  only.
                </p>

                {contrastReport.declaredCount === 0 ? (
                  <p className="mt-3 text-xs text-muted">
                    This template declares no color pairs in{" "}
                    <code className="break-words font-mono text-foreground">
                      meta.json
                    </code>
                    , so contrast was not audited.
                  </p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2">
                    {contrastReport.results.map((item) => (
                      <li
                        key={item.label}
                        className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
                          item.passes
                            ? "border-border bg-background text-foreground"
                            : "border-status-warn-border bg-status-warn-subtle/40 text-foreground"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-border-strong text-[10px] font-bold"
                            style={{
                              backgroundColor: item.background,
                              color: item.foreground,
                            }}
                          >
                            Aa
                          </span>
                          <div className="min-w-0">
                            <div className="break-words font-medium">
                              {item.label}
                            </div>
                            <div className="text-[11px] text-muted">
                              {item.largeText
                                ? "Large text / UI (≥3.0:1)"
                                : "Normal text (≥4.5:1)"}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-mono font-semibold">
                            {item.ratio.toFixed(2)}:1
                          </div>
                          <div
                            className={`text-[11px] font-semibold ${
                              item.passes
                                ? "text-status-pass"
                                : "text-status-warn"
                            }`}
                          >
                            {item.passes ? "Pass" : "Low contrast"}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Copy URL & Code Snippet */}
              <div className="min-w-0 rounded-xl border border-border bg-surface p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Share &amp; Integration
                </h2>
                <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-border bg-surface-muted p-2.5 font-mono text-[11px] break-all text-foreground-secondary">
                  {ogApiPath}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy("url")}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-accent-strong px-4 py-2 text-xs font-semibold text-accent-foreground transition hover:opacity-90 ${FOCUS_RING_CLASSES}`}
                  >
                    {copiedTarget === "url" ? "Copied URL!" : "Copy URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy("snippet")}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border-strong bg-background px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-muted ${FOCUS_RING_CLASSES}`}
                  >
                    {copiedTarget === "snippet"
                      ? "Copied snippet!"
                      : "Copy code snippet"}
                  </button>
                </div>
                <pre className="mt-3 max-w-full overflow-x-auto rounded-lg border border-border bg-surface-muted p-3 text-[11px] text-foreground">
                  <code className="block font-mono">
                    {buildMetadataSnippet(ogApiPath, selectedTemplate.name)}
                  </code>
                </pre>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
