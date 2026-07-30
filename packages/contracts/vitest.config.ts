import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/contracts",
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
  typeTests: true,
});
