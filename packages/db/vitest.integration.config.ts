import { defineConfig } from "vitest/config";

/**
 * Real-Postgres suite. Excluded from `test:unit` / `make check` so a laptop
 * without Docker can still run the default gate. Requires DATABASE_URL.
 */
export default defineConfig({
  test: {
    name: "@repo/db-integration",
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globals: false,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    // Schema setup + migrations need headroom on a cold Docker volume.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One file at a time: workers share one database and use transaction
    // rollback for isolation. File parallelism would race on the same rows.
    fileParallelism: false,
    // Vitest 4: pool options are top-level (poolOptions was removed).
    pool: "forks",
    maxWorkers: 1,
    passWithNoTests: false,
    allowOnly: process.env["CI"] === undefined,
  },
});
