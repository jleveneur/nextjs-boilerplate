import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/permissions",
  // This package is the authorization surface and is pure data plus grouping —
  // the same reason @repo/authz sits at 100.
  coverage: { lines: 100, functions: 100, branches: 100, statements: 100 },
});
