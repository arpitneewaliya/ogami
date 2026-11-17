import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTemplate } from "../registry/lib/render";
import { allTemplates } from "../registry/templates";

const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export interface GeneratedPreviewInfo {
  id: string;
  outPath: string;
  bytes: number;
  width: number;
  height: number;
}

export function readPngHeaderDimensions(buffer: ArrayBuffer): {
  isPng: boolean;
  width: number;
  height: number;
} {
  const bytes = new Uint8Array(buffer);
  const isPng =
    bytes.length >= 24 &&
    PNG_SIGNATURE.every((expectedByte, index) => bytes[index] === expectedByte);
  if (!isPng) {
    return { isPng: false, width: 0, height: 0 };
  }
  const view = new DataView(buffer);
  return {
    isPng: true,
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

export async function generateAllPreviews(
  rootDir = process.cwd(),
): Promise<GeneratedPreviewInfo[]> {
  const results: GeneratedPreviewInfo[] = [];

  for (const template of allTemplates) {
    const rendered = await renderTemplate(template, template.sample, {
      onUnsupportedScript: "throw",
      emoji: "fallback",
    });

    if (!rendered.ok) {
      throw new Error(
        `Preview render failed for template "${template.id}": ${rendered.error.message}`,
      );
    }

    if (rendered.isFallback) {
      throw new Error(
        `Template "${template.id}" rendered a fallback card instead of its design.`,
      );
    }

    if (rendered.response.status !== 200) {
      throw new Error(
        `Template "${template.id}" returned HTTP ${rendered.response.status}.`,
      );
    }

    const contentType = rendered.response.headers.get("content-type") ?? "";
    if (!contentType.includes("image/png")) {
      throw new Error(
        `Template "${template.id}" returned unexpected content-type "${contentType}".`,
      );
    }

    const arrayBuffer = await rendered.response.arrayBuffer();
    const { isPng, width, height } = readPngHeaderDimensions(arrayBuffer);

    if (!isPng) {
      throw new Error(
        `Template "${template.id}" output failed PNG signature verification.`,
      );
    }

    if (width !== EXPECTED_WIDTH || height !== EXPECTED_HEIGHT) {
      throw new Error(
        `Template "${template.id}" output dimensions ${width}x${height}, expected ${EXPECTED_WIDTH}x${EXPECTED_HEIGHT}.`,
      );
    }

    const relPath = path.join(
      "registry",
      "templates",
      template.id,
      "preview.png",
    );
    const outPath = path.join(rootDir, relPath);
    await writeFile(outPath, Buffer.from(arrayBuffer));

    const info: GeneratedPreviewInfo = {
      id: template.id,
      outPath: relPath,
      bytes: arrayBuffer.byteLength,
      width,
      height,
    };
    results.push(info);
    console.log(
      `${info.id}: ${info.outPath} (${info.bytes.toLocaleString("en-US")} bytes, ${info.width}x${info.height})`,
    );
  }

  return results;
}

const isCliEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  generateAllPreviews().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
