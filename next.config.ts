import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // TEMPORARY PHASE 0 SPIKE: Commented out so /api/og (nodejs) and /api/og-edge (edge)
  // can be built and benchmarked side-by-side. Next.js 16 cacheComponents forbids the
  // `runtime` route segment config and deprecates `runtime = "edge"`. Re-enable in Phase 1.
  // cacheComponents: true,
  // partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
