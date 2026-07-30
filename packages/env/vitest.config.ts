import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/env",
  // Config is load-bearing: a gap here is a secret that never validates or a
  // production check that never fires. Aim for full coverage; 90 % is the floor.
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          // Re-export barrels and the server entry (not importable under the default
          // condition by design — covered by server-only.test.ts instead).
          "src/client.ts",
          "src/server.ts",
          "src/shared.ts",
          "src/presets/index.ts",
          "src/index.ts",
          "src/**/*.test.ts",
          "src/**/*.test-d.ts",
          "src/**/*.d.ts",
          "src/**/__fixtures__/**",
        ],
      },
    },
  }),
);
