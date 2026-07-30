import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/observability",
  coverage: { lines: 70, functions: 70, branches: 70, statements: 70 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          "src/types.ts",
          // SDK wiring — exercised when flags are on; needs a collector / DSN.
          "src/init-otel.ts",
          "src/init-sentry.ts",
          "src/testing/**",
          "src/**/*.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
