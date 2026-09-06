import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vitest/config";

import { defineLibraryConfig } from "@repo/vitest-config";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit tests for the product app's pure logic.
 *
 * Screens and data flow are covered by Playwright (`e2e/`) against a real
 * server, which is the only place a Server Component's behaviour is observable.
 * What belongs here is the framework-free logic those journeys route through —
 * redirect-target sanitising, path matching, cookie-gate rules — where a browser
 * round trip is a slow way to assert a pure function, and where an E2E suite
 * only ever exercises the happy path.
 *
 * No coverage threshold, deliberately: most of `src/` is not reachable from
 * here, so a percentage over the whole app would measure the split between
 * suites rather than how well anything is tested.
 */
const base = defineLibraryConfig({
  name: "@repo/web",
});

export default mergeConfig(
  base,
  defineConfig({
    resolve: {
      alias: {
        "@": path.join(root, "src"),
      },
    },
    test: {
      server: {
        deps: {
          // next-intl's middleware imports `next/server` without the extension
          // Node's ESM resolver needs. Processing it through Vite rather than
          // leaving it external is what resolves that import.
          inline: ["next-intl"],
        },
      },
      coverage: {
        enabled: false,
      },
    },
  }),
);
