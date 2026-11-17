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
      className="shrink-0 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
