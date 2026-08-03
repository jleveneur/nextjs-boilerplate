import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/core",
  // Documented floor for this package (docs/architecture/10-testing.md).
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
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
        exclude: [
          "src/index.ts",
          "src/ctx.ts",
          "src/testing/index.ts",
          "src/ports/**",
          // Covered by integration tests (Postgres / worker).
          "src/outbox/**",
          "src/assets/**",
          "src/system-actor.ts",
          "src/billing/billing.repository.ts",
          "src/billing/billing.mapper.ts",
          "src/billing/index.ts",
          "src/subscription/subscription.repository.ts",
          "src/subscription/index.ts",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
