import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/worker",
});

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        "server-only": path.join(root, "vitest.server-only-stub.ts"),
      },
    },
  }),
);
