import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/db",
  // Layer-1 adapters sit at 70 % (docs/architecture/10-testing.md). Repository
  // behaviour is covered by integration tests against real Postgres.
  coverage: { lines: 70, functions: 70, branches: 70, statements: 70 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          "src/migrate.ts",
          "src/env.ts",
          "src/schema/**",
          "src/seeds/**",
          "src/testing/**",
          "src/repositories/**",
          "src/**/*.test.ts",
          "src/**/*.integration.test.ts",
          "src/**/*.d.ts",
          "src/**/__fixtures__/**",
        ],
      },
    },
  }),
);
