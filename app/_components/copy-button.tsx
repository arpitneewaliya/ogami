"use client";

import { useCallback, useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
}

export default function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures in headless/restricted contexts.
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`${label}: ${text}`}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-surface px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
