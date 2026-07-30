import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/authz",
  // Documented floor for this package (docs/architecture/10-testing.md).
  coverage: { lines: 100, functions: 100, branches: 100, statements: 100 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: ["src/index.ts", "src/testing.ts", "src/**/*.test.ts", "src/**/*.d.ts"],
      },
    },
  }),
);
