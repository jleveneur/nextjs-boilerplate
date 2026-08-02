import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/analytics",
  coverage: { lines: 70, functions: 70, branches: 70, statements: 70 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          "src/client.ts",
          "src/posthog-sink.ts",
          "src/testing/**",
          "src/**/*.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
