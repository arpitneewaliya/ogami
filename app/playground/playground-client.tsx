"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
      <div className="mx-auto max-w-4xl p-8 text-sm text-zinc-400">
        No templates registered.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-zinc-100 hover:text-sky-400"
            >
              Ogami
            </Link>
            <span className="text-zinc-600">/</span>
            <h1 className="text-sm font-medium text-zinc-300">Playground</h1>
          </div>
          <div className="text-xs text-zinc-400">
            {templates.length} templates · {selectedTemplate.width}×
            {selectedTemplate.height}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[400px_1fr]">
        {/* Left panel: template picker, zod-generated form, script warnings */}
        <section className="flex min-w-0 flex-col gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Template
              </h2>
              <button
                type="button"
                onClick={handleResetSample}
                className="rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700"
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
                    onClick={() => handleSelectTemplate(tpl.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      isActive
                        ? "border-sky-500/70 bg-sky-500/10 text-zinc-100"
                        : "border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{tpl.name}</span>
                      <code className="text-[11px] text-zinc-400">
                        {tpl.id}
                      </code>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">
                      {tpl.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parameters (Zod JSON Schema)
            </h2>
            <div className="flex flex-col gap-4">
              {fields.map((field) => {
                const val = activeValues[field.name];
                const strVal = typeof val === "string" ? val : "";

                if (field.kind === "boolean") {
                  return (
                    <label
                      key={field.name}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
                    >
                      <span>
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-rose-400">*</span>
                        ) : null}
                      </span>
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.checked)
                        }
                        className="h-4 w-4 accent-sky-500"
                      />
                    </label>
                  );
                }

                if (field.kind === "select" && field.options) {
                  return (
                    <div key={field.name} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`field-${field.name}`}
                        className="text-xs font-medium text-zinc-300"
                      >
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-rose-400">*</span>
                        ) : null}
                      </label>
                      <select
                        id={`field-${field.name}`}
                        value={strVal}
                        onChange={(e) =>
                          handleFieldChange(field.name, e.target.value)
                        }
                        className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
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
                          className="font-medium text-zinc-300"
                        >
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 text-rose-400">*</span>
                          ) : null}
                        </label>
                        {field.maxLength ? (
                          <span className="text-zinc-500">
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
                          className="h-9 w-11 cursor-pointer rounded border border-zinc-700 bg-zinc-950 p-0.5"
                        />
                        <input
                          id={`field-${field.name}`}
                          type="text"
                          value={strVal}
                          maxLength={field.maxLength}
                          onChange={(e) =>
                            handleFieldChange(field.name, e.target.value)
                          }
                          className="h-9 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-3 font-mono text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
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
                        className="text-xs font-medium text-zinc-300"
                      >
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-rose-400">*</span>
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
                        className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
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
                        className="font-medium text-zinc-300"
                      >
                        {field.label}
                        {field.required ? (
                          <span className="ml-1 text-rose-400">*</span>
                        ) : null}
                      </label>
                      {field.maxLength ? (
                        <span className="text-zinc-500">
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
                        className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
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
                        className="h-9 rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
                      />
                    )}
                    {field.fallbackNote ? (
                      <p className="text-[11px] text-amber-300">
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
              className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200"
            >
              <div className="font-semibold text-rose-100">
                Unsupported script detected
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {scriptAnalysis.unsupportedIssues.map((issue) => (
                  <li key={`${issue.field}-${issue.script}`}>
                    <span className="font-mono font-semibold">
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
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-200">
              <div className="font-semibold text-amber-100">
                Emoji detected (stripped by default)
              </div>
              <p className="mt-1">
                <code className="break-words font-mono">next/og</code> triggers external Twemoji CDN requests when
                rendering emoji, so <code className="break-words font-mono">/api/og</code> strips them by default
                to stay offline-safe.
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {scriptAnalysis.emojiWarnings.map((w) => (
                  <li key={w.field}>
                    <span className="font-mono">{w.field}</span>:{" "}
                    {w.removed.join(" ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* Right panel: live preview, platform overlays, contrast, copy controls */}
        <section className="flex min-w-0 flex-col gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Live Preview
                </h2>
                {previewLoading ? (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                    Rendering...
                  </span>
                ) : null}
                {previewMeta.isFallback ? (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                    Fallback card ({previewMeta.unsupportedScripts || "guarded"})
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedOverlayId("none")}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    selectedOverlayId === "none"
                      ? "border-sky-500 bg-sky-500/20 text-sky-100"
                      : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
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
                      onClick={() => setSelectedOverlayId(platform.id)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition ${
                        isActive
                          ? platform.verified
                            ? "border-sky-500 bg-sky-500/20 text-sky-100"
                            : "border-amber-400 border-dashed bg-amber-500/15 text-amber-100"
                          : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-600"
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
                className="flex aspect-[1200/630] w-full flex-col justify-center rounded-lg border border-rose-500/40 bg-rose-950/20 p-6 text-sm text-rose-200"
              >
                <div className="font-semibold text-rose-100">
                  {previewError.message}
                </div>
                {previewError.issues.length > 0 ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
                    {previewError.issues.map((issue, idx) => (
                      <li key={`${issue.field}-${idx}`}>
                        <span className="font-mono">{issue.field}</span>:{" "}
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {previewObjectUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Renders dynamic blob URL fetched from /api/og
                  <img
                    src={previewObjectUrl}
                    alt={`${selectedTemplate.name} live preview`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
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
                          ? "border-2 border-solid border-sky-400"
                          : "border-2 border-dashed border-amber-400"
                      }`}
                      style={{
                        left: `${(cropRect.x / selectedTemplate.width) * 100}%`,
                        top: `${(cropRect.y / selectedTemplate.height) * 100}%`,
                        width: `${(cropRect.width / selectedTemplate.width) * 100}%`,
                        height: `${(cropRect.height / selectedTemplate.height) * 100}%`,
                      }}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium ${
                          selectedPlatform.verified
                            ? "bg-sky-500/90 text-zinc-950"
                            : "bg-amber-400/95 text-zinc-950"
                        }`}
                      >
                        <span>
                          {selectedPlatform.name} ·{" "}
                          {selectedPlatform.aspectRatioLabel}
                        </span>
                        {!selectedPlatform.verified ? (
                          <span className="rounded bg-zinc-950/20 px-1 font-semibold uppercase">
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
              <p className="mt-2 break-words text-xs text-amber-300">
                Route header <code className="break-words font-mono">X-Ogami-Warnings</code>:{" "}
                {previewMeta.warnings}
              </p>
            ) : null}

            {selectedPlatform ? (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs text-zinc-300">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-100">
                    {selectedPlatform.name} ({selectedPlatform.aspectRatioLabel})
                    {!selectedPlatform.verified ? " — Unverified" : ""}
                  </span>
                  <span className="text-zinc-400">
                    Last checked: {selectedPlatform.lastVerified}
                  </span>
                </div>
                <p className="mt-1 text-zinc-400">{selectedPlatform.note}</p>
                {selectedPlatform.sourceUrl ? (
                  <a
                    href={selectedPlatform.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sky-400 underline hover:text-sky-300"
                  >
                    Source documentation
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
              <span className="font-medium text-zinc-300">
                Omitted from overlays:
              </span>
              {UNDOCUMENTED_PLATFORMS.map((item) => (
                <span key={item.id}>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-zinc-200"
                  >
                    {item.name}
                  </a>
                  : {item.statusLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* WCAG Contrast panel */}
            <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Contrast Audit (WCAG AA)
                </h2>
                {contrastReport.warnings.length > 0 ? (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-200">
                    {contrastReport.warnings.length} warning
                    {contrastReport.warnings.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                Checks declared color pairs in <code className="break-words font-mono">meta.json</code> only.
              </p>

              {contrastReport.declaredCount === 0 ? (
                <p className="mt-3 text-xs text-zinc-400">
                  This template declares no color pairs in{" "}
                  <code className="break-words font-mono">meta.json</code>, so contrast was not audited.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {contrastReport.results.map((item) => (
                    <li
                      key={item.label}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                        item.passes
                          ? "border-zinc-800 bg-zinc-950/60 text-zinc-200"
                          : "border-amber-500/50 bg-amber-950/30 text-amber-100"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-700 text-[10px] font-bold"
                          style={{
                            backgroundColor: item.background,
                            color: item.foreground,
                          }}
                        >
                          Aa
                        </span>
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-[11px] text-zinc-400">
                            {item.largeText ? "Large text / UI (≥3.0:1)" : "Normal text (≥4.5:1)"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          {item.ratio.toFixed(2)}:1
                        </div>
                        <div
                          className={`text-[11px] ${
                            item.passes ? "text-emerald-400" : "text-amber-300"
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
            <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Share &amp; Integration
              </h2>
              <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[11px] break-all text-zinc-300">
                {ogApiPath}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy("url")}
                  className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
                >
                  {copiedTarget === "url" ? "Copied URL!" : "Copy URL"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy("snippet")}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-700"
                >
                  {copiedTarget === "snippet"
                    ? "Copied snippet!"
                    : "Copy code snippet"}
                </button>
              </div>
              <pre className="mt-3 max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-[11px] text-zinc-300">
                <code className="block overflow-x-auto font-mono">
                  {buildMetadataSnippet(ogApiPath, selectedTemplate.name)}
                </code>
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
