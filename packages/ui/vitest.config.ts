import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/ui",
  environment: "jsdom",
  // Documented floor (docs/architecture/10-testing.md) — behaviour + a11y.
  coverage: { lines: 60, functions: 60, branches: 60, statements: 60 },
});
