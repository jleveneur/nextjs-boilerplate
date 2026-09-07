import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

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
          // Postgres-backed: writeOutboxEvent is proven by
          // write-outbox-event.integration.test.ts, the relay's dispatch by
          // relay.test.ts. Neither runs under the unit-test threshold.
          "src/outbox/**",
          // Covered by integration tests (Postgres / S3).
          "src/assets/**",
          "src/system-actor.ts",
          // Stated as the rule rather than one line per slice. A repository is
          // queries with no policy, exercised by `*.integration.test.ts` against
          // real Postgres; a mapper is row-to-DTO translation. Enumerating them
          // meant every new slice silently dropped the package below its floor
          // until someone remembered to edit this file.
          "src/**/*.repository.ts",
          "src/**/*.mapper.ts",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
