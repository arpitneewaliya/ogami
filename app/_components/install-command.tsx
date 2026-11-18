import { getSiteUrlConfig } from "@/site.config";
import CopyButton from "./copy-button";

interface InstallCommandProps {
  itemName: string;
  compact?: boolean;
}

export default function InstallCommand({
  itemName,
  compact = false,
}: InstallCommandProps) {
  const { url, isPlaceholder } = getSiteUrlConfig();
  const command = `npx shadcn@latest add ${url}/r/${itemName}.json`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/90 ${
          compact ? "px-3 py-2" : "px-4 py-3"
        }`}
      >
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-sky-300 sm:text-sm">
          {command}
        </code>
        <CopyButton text={command} label="Copy command" />
      </div>

      {isPlaceholder ? (
        <p className="break-words text-xs text-amber-300/90">
          Placeholder URL (<code className="break-all font-mono">{url}</code>) — set{" "}
          <code className="break-words font-mono">NEXT_PUBLIC_SITE_URL</code> to switch to
          your deployed registry domain.
        </p>
      ) : null}
    </div>
  );
}
