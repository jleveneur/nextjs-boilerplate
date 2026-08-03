import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/ui",
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
  // Documented floor (docs/architecture/10-testing.md) — behaviour + a11y.
  coverage: { lines: 60, functions: 60, branches: 60, statements: 60 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          "src/icons/index.ts",
          "src/motion/index.ts",
          "src/sonner/index.ts",
          "src/chart/index.ts",
          "src/editor/index.ts",
          "src/table/index.ts",
          "src/test/**",
          "src/**/*.test.ts",
          "src/**/*.test.tsx",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
