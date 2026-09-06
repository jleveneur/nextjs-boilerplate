import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/worker",
  coverage: { lines: 70, functions: 80, branches: 60, statements: 70 },
});

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        "server-only": path.join(root, "vitest.server-only-stub.ts"),
      },
    },
    test: {
      coverage: {
        // Same rule as `apps/api`: what a job *does* is measured here, how the
        // process is assembled is not. The container, env, and schedule
        // registration are exercised by `phase10.integration.test.ts` against
        // real Redis and Postgres.
        exclude: [
          "src/index.ts",
          "src/app.ts",
          "src/container.ts",
          "src/env.ts",
          "src/observability.ts",
          "src/schedules.ts",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
