import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/kernel",
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
          // Type-only: `Ctx` is a record of the ports, with no behaviour.
          "src/ctx.ts",
          "src/testing/index.ts",
          // Port definitions. The in-memory implementations under
          // `src/testing` are the behaviour, and ports.test.ts covers them.
          "src/ports/**",
          // Postgres-backed: writeOutboxEvent is proven by
          // write-outbox-event.integration.test.ts, the relay's dispatch by
          // relay.test.ts. Neither runs under the unit-test threshold.
          "src/outbox/**",
          "src/system-actor.ts",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
