/**
 * Committed default placeholder domain used when `NEXT_PUBLIC_SITE_URL` is unset.
 * `scripts/build-registry.ts` always reads `DEFAULT_SITE_URL` directly so `public/r/`
 * remains deterministic across machines and CI.
 */
export const DEFAULT_SITE_URL = "https://ogami-toolkit.vercel.app";

export interface SiteUrlConfig {
  url: string;
  isPlaceholder: boolean;
}

/**
 * Resolves the site base URL for rendered website pages (install commands,
 * snippets, metadata). Reads `NEXT_PUBLIC_SITE_URL` if set, otherwise returns
 * `DEFAULT_SITE_URL` with `isPlaceholder: true`.
 */
export function getSiteUrlConfig(): SiteUrlConfig {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && raw.length > 0) {
    return {
      url: raw.replace(/\/+$/, ""),
      isPlaceholder: false,
    };
  }
  return {
    url: DEFAULT_SITE_URL,
    isPlaceholder: true,
  };
}
