// TEMPORARY PHASE 0 SPIKE CODE (Node.js runtime) — DO NOT USE AS PHASE 1 IMPLEMENTATION

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { renderSpikeCard, resolveSpikeCase } from "./_spike-cases";

export const runtime = "nodejs";

interface LoadedFont {
  name: string;
  data: Buffer;
  weight: 400;
  style: "normal";
}

const FONT_SPECS: ReadonlyArray<{ name: string; file: string }> = [
  { name: "Noto Sans", file: "NotoSans-Regular.ttf" },
  { name: "Noto Sans Devanagari", file: "NotoSansDevanagari-Regular.ttf" },
  { name: "Noto Sans JP", file: "NotoSansJP-Regular.ttf" },
  { name: "Noto Sans Arabic", file: "NotoSansArabic-Regular.ttf" },
];

let cachedFontsPromise: Promise<LoadedFont[]> | null = null;

function loadSpikeFonts(): Promise<LoadedFont[]> {
  if (!cachedFontsPromise) {
    cachedFontsPromise = Promise.all(
      FONT_SPECS.map(async (spec) => ({
        name: spec.name,
        data: await readFile(
          join(process.cwd(), "public", "spike-fonts", spec.file),
        ),
        weight: 400 as const,
        style: "normal" as const,
      })),
    );
  }
  return cachedFontsPromise;
}

export async function GET(request: Request): Promise<Response> {
  const start = performance.now();
  const { searchParams } = new URL(request.url);
  const testCase = resolveSpikeCase(searchParams.get("case"));
  const applyDirectionCss = searchParams.get("rtl") === "1";

  const fonts = await loadSpikeFonts();
  const imageResponse = new ImageResponse(
    renderSpikeCard(testCase, { applyDirectionCss }),
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  const pngBytes = await imageResponse.arrayBuffer();
  const elapsedMs = performance.now() - start;

  return new Response(pngBytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Runtime": "nodejs",
      "X-Render-Time-Ms": elapsedMs.toFixed(2),
    },
  });
}
