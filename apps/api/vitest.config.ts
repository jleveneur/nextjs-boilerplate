import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/api",
  coverage: { lines: 90, functions: 90, branches: 75, statements: 90 },
});

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        // Matches the integration config and `apps/worker`: anything reaching
        // `@repo/logger` pulls in `server-only`, which throws outside Next.
        "server-only": path.join(root, "vitest.server-only-stub.ts"),
      },
    },
    test: {
      coverage: {
        // Coverage here measures request-path logic. Composition roots and
        // process entry points are wiring — exercised by the integration suite
        // and by the container images actually booting, not by unit tests, and
        // counting them would only push the threshold down to where it stops
        // catching regressions in the code it does cover.
        exclude: [
          "src/index.ts",
          "src/app.ts",
          "src/env.ts",
          "src/migrate.ts",
          "src/observability.ts",
          "src/openapi-app.ts",
          "src/openapi-generate.ts",
          "src/server/**",
          "src/testing/**",
          // Route handlers are covered end-to-end by `*.integration.test.ts`
          // against a real database; see `vitest.integration.config.ts`.
          "src/routes/**",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
