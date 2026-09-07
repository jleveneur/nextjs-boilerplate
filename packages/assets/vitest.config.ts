import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

const base = defineLibraryConfig({
  name: "@repo/assets",
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
          // Postgres + S3 backed; no unit test drives them today. See the
          // coverage gap in docs/architecture/10-testing.md.
          "src/asset.service.ts",
          // Stated as the rule rather than one line per file. A repository is
          // queries with no policy, exercised by `*.integration.test.ts` against
          // real Postgres; a mapper is row-to-DTO translation.
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
