import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/utils",
  // 90 % is the documented floor for this package (docs/architecture/10-testing.md).
  // Pure functions with no I/O have no excuse for gaps, so actual coverage should
  // sit well above it; the threshold is there to catch a helper added without tests.
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
});
