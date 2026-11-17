import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderTemplate } from "../registry/lib/render";
import repoLaunchTemplate from "../registry/templates/repo-launch/template";
import { readPngHeaderDimensions } from "./generate-previews";

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 640;
const MAX_GITHUB_PREVIEW_BYTES = 1_000_000;

export async function generateRepoSocialPreview(
  rootDir = process.cwd(),
): Promise<{ outPath: string; bytes: number; width: number; height: number }> {
  const rendered = await renderTemplate(
    repoLaunchTemplate,
    {
      repo: "ogami",
      tagline:
        "Next.js-first, code-first OG template registry with guardrails and developer milestone cards.",
      badge: "OPEN SOURCE",
      language: "TypeScript",
      license: "MIT",
      handle: "Next.js 16 · next/og",
      accentColor: "#38bdf8",
    },
    {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      onUnsupportedScript: "throw",
      emoji: "fallback",
    },
  );

  if (!rendered.ok || rendered.isFallback) {
    throw new Error("Failed to render repository social preview image.");
  }

  const buffer = await rendered.response.arrayBuffer();
  const { isPng, width, height } = readPngHeaderDimensions(buffer);
  if (!isPng || width !== TARGET_WIDTH || height !== TARGET_HEIGHT) {
    throw new Error(
      `Unexpected PNG output (${width}x${height}); expected ${TARGET_WIDTH}x${TARGET_HEIGHT}.`,
    );
  }
  if (buffer.byteLength >= MAX_GITHUB_PREVIEW_BYTES) {
    throw new Error(
      `Social preview exceeds GitHub's <1 MB limit (${buffer.byteLength} bytes).`,
    );
  }

  const relPath = path.join("docs", "social-preview.png");
  const outPath = path.join(rootDir, relPath);
  await writeFile(outPath, Buffer.from(buffer));

  console.log(
    `Generated ${relPath} (${buffer.byteLength.toLocaleString("en-US")} bytes, ${width}x${height})`,
  );

  return {
    outPath: relPath,
    bytes: buffer.byteLength,
    width,
    height,
  };
}

const isCliEntry =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCliEntry) {
  generateRepoSocialPreview().catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(message);
    process.exit(1);
  });
}
