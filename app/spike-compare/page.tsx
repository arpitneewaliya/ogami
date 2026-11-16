// TEMPORARY PHASE 0 SPIKE CODE — REMOVE OR REPLACE IN PHASE 1

import {
  renderSpikeCard,
  SPIKE_CASES,
  SPIKE_CASE_KEYS,
} from "../api/og/_spike-cases";

const FONT_FACE_CSS = `
  @font-face {
    font-family: 'Noto Sans';
    src: url('/spike-fonts/NotoSans-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Noto Sans Devanagari';
    src: url('/spike-fonts/NotoSansDevanagari-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Noto Sans JP';
    src: url('/spike-fonts/NotoSansJP-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
  @font-face {
    font-family: 'Noto Sans Arabic';
    src: url('/spike-fonts/NotoSansArabic-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style: normal;
  }
`;

export default function SpikeComparePage() {
  return (
    <main
      style={{
        padding: 32,
        backgroundColor: "#020617",
        color: "#e2e8f0",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{FONT_FACE_CSS}</style>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Ogami Phase 0: Browser HTML vs. Satori PNG Comparison
      </h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>
        Comparing Chromium native text shaping/BiDi against Satori (next/og)
        using identical Noto Sans TTF files. Scaled to 50% (600×315) for
        side-by-side inspection.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
        {SPIKE_CASE_KEYS.map((key) => {
          const testCase = SPIKE_CASES[key];
          return (
            <section
              key={key}
              style={{
                border: "1px solid #1e293b",
                borderRadius: 12,
                padding: 24,
                backgroundColor: "#090f1f",
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
                {testCase.label}
              </h2>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 24,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#94a3b8",
                      marginBottom: 8,
                    }}
                  >
                    Plain HTML (Chromium + @font-face, default direction)
                  </div>
                  <div
                    style={{
                      width: 600,
                      height: 315,
                      overflow: "hidden",
                      border: "1px solid #334155",
                    }}
                  >
                    <div
                      style={{
                        transform: "scale(0.5)",
                        transformOrigin: "top left",
                        width: 1200,
                        height: 630,
                      }}
                    >
                      {renderSpikeCard(testCase)}
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#94a3b8",
                      marginBottom: 8,
                    }}
                  >
                    Satori PNG (/api/og?case={key})
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/og?case=${key}`}
                    alt={`Satori PNG for ${testCase.label}`}
                    width={600}
                    height={315}
                    style={{
                      width: 600,
                      height: 315,
                      border: "1px solid #334155",
                      display: "block",
                    }}
                  />
                </div>

                {testCase.isRtl ? (
                  <>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#38bdf8",
                          marginBottom: 8,
                        }}
                      >
                        Plain HTML with dir=&quot;rtl&quot; + direction: rtl
                      </div>
                      <div
                        dir="rtl"
                        style={{
                          width: 600,
                          height: 315,
                          overflow: "hidden",
                          border: "1px solid #38bdf8",
                        }}
                      >
                        <div
                          style={{
                            transform: "scale(0.5)",
                            transformOrigin: "top right",
                            width: 1200,
                            height: 630,
                          }}
                        >
                          {renderSpikeCard(testCase, {
                            applyDirectionCss: true,
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "#38bdf8",
                          marginBottom: 8,
                        }}
                      >
                        Satori PNG with direction: rtl (/api/og?case={key}
                        &amp;rtl=1)
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/og?case=${key}&rtl=1`}
                        alt={`Satori PNG (rtl=1) for ${testCase.label}`}
                        width={600}
                        height={315}
                        style={{
                          width: 600,
                          height: 315,
                          border: "1px solid #38bdf8",
                          display: "block",
                        }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
