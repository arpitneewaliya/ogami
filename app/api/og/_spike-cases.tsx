// TEMPORARY PHASE 0 SPIKE CODE — REMOVE OR REPLACE IN PHASE 1

import type { ReactElement } from "react";

export type SpikeCaseKey =
  | "en"
  | "hi"
  | "ja"
  | "ar"
  | "mixed"
  | "bidi"
  | "hi-wrap";

export interface SpikeCase {
  key: SpikeCaseKey;
  label: string;
  text: string;
  subtitle: string;
  isRtl?: boolean;
}

export const SPIKE_CASES: Record<SpikeCaseKey, SpikeCase> = {
  en: {
    key: "en",
    label: "1. English (Latin)",
    text: "Ogami: Code-first Open Graph images for Next.js",
    subtitle: "The quick brown fox jumps over the lazy dog — 0123456789",
  },
  hi: {
    key: "hi",
    label: "2. Hindi (Devanagari)",
    text: "नमस्ते दुनिया — देवनागरी लिपि और संयुक्ताक्षर परीक्षण",
    subtitle: "किताब, बुद्धि, राष्ट्रीय, प्रकृति, क्षत्रिय, ज्ञान, श्रृंगार",
  },
  ja: {
    key: "ja",
    label: "3. Japanese (Hiragana, Katakana, Kanji)",
    text: "こんにちは世界 — 日本語フォントと文字レンダリングのテスト",
    subtitle: "次世代のオープンソース OG 画像ツールキット (1200×630)",
  },
  ar: {
    key: "ar",
    label: "4. Arabic (Pure RTL & Contextual Shaping)",
    text: "مرحبا بالعالم — اختبار تشكيل الحروف والاتجاه من اليمين لليسار",
    subtitle: "تصميم بطاقات المعاينة الاجتماعية للمطورين بسهولة",
    isRtl: true,
  },
  mixed: {
    key: "mixed",
    label: "5. Mixed Latin + Devanagari + Japanese (Single Line)",
    text: "Ogami v0.1 • नमस्ते दुनिया • こんにちは世界",
    subtitle: "Single-line multi-script fallback: Latin + हिन्दी + 日本語",
  },
  bidi: {
    key: "bidi",
    label: "6. Bidirectional (Arabic + English + Numbers)",
    text: "إصدار Ogami v1.0 حقق 1,250 نجمة على GitHub في 48 ساعة!",
    subtitle: "دمج النص العربي مع Next.js 16 و TypeScript والأرقام 2026",
    isRtl: true,
  },
  "hi-wrap": {
    key: "hi-wrap",
    label: "7. Long Hindi Title (Multi-line Wrapping)",
    text: "ओगामी: नेक्स्ट.जेएस डेवलपर्स के लिए कोड-फ़र्स्ट ओपन ग्राफ़ इमेज टूलकिट जो बिना किसी डिज़ाइन टूल के सुंदर सोशल प्रीव्यू कार्ड बनाता है",
    subtitle: "लंबी शीर्षक पंक्तियों के स्वचालित रैपिंग और मात्रा संरेखण का परीक्षण",
  },
};

export const SPIKE_CASE_KEYS = Object.keys(SPIKE_CASES) as SpikeCaseKey[];

export function resolveSpikeCase(rawKey: string | null): SpikeCase {
  if (rawKey && rawKey in SPIKE_CASES) {
    return SPIKE_CASES[rawKey as SpikeCaseKey];
  }
  return SPIKE_CASES.en;
}

export const SPIKE_FONT_FAMILY =
  "'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans JP', 'Noto Sans Arabic'";

export function renderSpikeCard(
  testCase: SpikeCase,
  options?: { applyDirectionCss?: boolean },
): ReactElement {
  const applyDirection = options?.applyDirectionCss ?? false;
  const isRtlApplied = applyDirection && Boolean(testCase.isRtl);
  const textAlign = isRtlApplied ? "right" : "left";
  const directionStyle = isRtlApplied ? { direction: "rtl" as const } : {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: 1200,
        height: 630,
        padding: 64,
        backgroundColor: "#0f172a",
        color: "#f8fafc",
        fontFamily: SPIKE_FONT_FAMILY,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            color: "#38bdf8",
            letterSpacing: "0.02em",
          }}
        >
          {testCase.label}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            color: "#94a3b8",
          }}
        >
          {`case=${testCase.key} • 1200×630`}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            fontSize: 44,
            lineHeight: 1.4,
            color: "#ffffff",
            ...directionStyle,
            textAlign,
            justifyContent: isRtlApplied ? "flex-end" : "flex-start",
          }}
        >
          {testCase.text}
        </div>
        <div
          style={{
            display: "flex",
            width: "100%",
            fontSize: 26,
            lineHeight: 1.4,
            color: "#cbd5e1",
            ...directionStyle,
            textAlign,
            justifyContent: isRtlApplied ? "flex-end" : "flex-start",
          }}
        >
          {testCase.subtitle}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          borderTop: "1px solid #334155",
          paddingTop: 20,
          fontSize: 18,
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex" }}>Ogami Phase 0 Multi-Script Spike</div>
        <div style={{ display: "flex" }}>
          Noto Sans / Devanagari / JP / Arabic
        </div>
      </div>
    </div>
  );
}
