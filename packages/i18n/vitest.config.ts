import { defineLibraryConfig } from "@repo/vitest-config";

export default defineLibraryConfig({
  name: "@repo/i18n",
  coverage: { lines: 90, functions: 90, branches: 90, statements: 90 },
  typeTests: true,
});
