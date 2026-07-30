import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@repo/cache-integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globals: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
    pool: "forks",
    maxWorkers: 1,
    passWithNoTests: false,
    allowOnly: process.env["CI"] === undefined,
  },
});
