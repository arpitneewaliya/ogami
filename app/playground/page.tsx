import { readFile } from "node:fs/promises";
import path from "node:path";
import { Suspense } from "react";
import { z } from "zod";
import type { ContrastColorPair } from "@/registry/lib/contrast";
import { getSupportedScripts } from "@/registry/lib/fonts";
import { allTemplates } from "@/registry/templates";
import PlaygroundClient, {
  type PlaygroundTemplateDescriptor,
} from "./playground-client";
import type { JsonSchemaObject } from "./schema-form";

interface TemplateMetaFile {
  colors?: ContrastColorPair[];
}

async function loadTemplateMetaColors(
  templateId: string,
): Promise<ContrastColorPair[] | undefined> {
  const metaPath = path.join(
    process.cwd(),
    "registry",
    "templates",
    templateId,
    "meta.json",
  );
  const raw = await readFile(metaPath, "utf8");
  const parsed = JSON.parse(raw) as TemplateMetaFile;
  return Array.isArray(parsed.colors) ? parsed.colors : undefined;
}

async function buildTemplateDescriptors(): Promise<
  PlaygroundTemplateDescriptor[]
> {
  return Promise.all(
    allTemplates.map(async (template) => {
      const jsonSchema = z.toJSONSchema(template.params, {
        io: "input",
        unrepresentable: "any",
      }) as JsonSchemaObject;
      const colors = await loadTemplateMetaColors(template.id);

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        width: template.width ?? 1200,
        height: template.height ?? 630,
        sample: template.sample,
        jsonSchema,
        colors,
      };
    }),
  );
}

async function PlaygroundLoader() {
  const [templates, supportedScripts] = await Promise.all([
    buildTemplateDescriptors(),
    getSupportedScripts(),
  ]);

  return (
    <PlaygroundClient
      templates={templates}
      supportedScripts={supportedScripts}
    />
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-background text-sm text-muted">
          Loading Ogami Playground...
        </div>
      }
    >
      <PlaygroundLoader />
    </Suspense>
  );
}
