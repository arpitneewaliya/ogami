import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    include: [
      "registry/**/*.test.ts",
      "registry/**/*.test.tsx",
      "app/**/*.test.ts",
      "app/**/*.test.tsx",
      "scripts/**/*.test.ts",
    ],
  },
});
