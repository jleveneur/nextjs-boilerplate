import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.join(root, "vitest.server-only-stub.ts"),
    },
  },
  test: {
    name: "@repo/core-integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    passWithNoTests: false,
    allowOnly: process.env["CI"] === undefined,
  },
});
