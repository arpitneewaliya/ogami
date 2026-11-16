// TEMPORARY PHASE 0 SPIKE CODE (Edge runtime) — DO NOT USE AS PHASE 1 IMPLEMENTATION

import { ImageResponse } from "next/og";
import { renderSpikeCard, resolveSpikeCase } from "../og/_spike-cases";

export const runtime = "edge";

interface LoadedFont {
  name: string;
  data: ArrayBuffer;
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

function loadSpikeFontsEdge(requestUrl: string): Promise<LoadedFont[]> {
  if (!cachedFontsPromise) {
    cachedFontsPromise = Promise.all(
      FONT_SPECS.map(async (spec) => {
        const fontUrl = new URL(`/spike-fonts/${spec.file}`, requestUrl);
        const res = await fetch(fontUrl);
        if (!res.ok) {
          throw new Error(`Failed to fetch font ${spec.file}: ${res.status}`);
        }
        return {
          name: spec.name,
          data: await res.arrayBuffer(),
          weight: 400 as const,
          style: "normal" as const,
        };
      }),
    );
  }
  return cachedFontsPromise;
}

export async function GET(request: Request): Promise<Response> {
  const start = performance.now();
  const { searchParams } = new URL(request.url);
  const testCase = resolveSpikeCase(searchParams.get("case"));
  const applyDirectionCss = searchParams.get("rtl") === "1";

  const fonts = await loadSpikeFontsEdge(request.url);
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
      "X-Runtime": "edge",
      "X-Render-Time-Ms": elapsedMs.toFixed(2),
    },
  });
}
