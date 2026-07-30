import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/errors",
  // 100 % is the Phase 2 exit criterion. This package is small, pure, and every
  // branch is a boundary clients and Sentry depend on — a gap is a leak or a
  // silent misclassification.
  coverage: { lines: 100, functions: 100, branches: 100, statements: 100 },
  typeTests: true,
});
