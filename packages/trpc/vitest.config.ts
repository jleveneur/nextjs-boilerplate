import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/trpc",
  coverage: { lines: 80, functions: 80, branches: 70, statements: 80 },
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
          // Procedure wiring exercised via createCaller; formatter/mapper unit-tested.
          "src/trpc.ts",
          "src/root.ts",
          "src/context.ts",
          "src/**/*.test.ts",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
