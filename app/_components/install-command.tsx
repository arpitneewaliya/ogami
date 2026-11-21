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
        className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted ${
          compact ? "px-3 py-1.5" : "px-4 py-2"
        }`}
      >
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap py-1 font-mono text-xs text-accent sm:text-sm">
          {command}
        </code>
        <CopyButton text={command} label="Copy command" />
      </div>

      {isPlaceholder ? (
        <p className="break-words text-xs text-status-warn">
          Placeholder URL (<code className="break-all font-mono">{url}</code>) — set{" "}
          <code className="break-words font-mono">NEXT_PUBLIC_SITE_URL</code> to switch to
          your deployed registry domain.
        </p>
      ) : null}
    </div>
  );
}
