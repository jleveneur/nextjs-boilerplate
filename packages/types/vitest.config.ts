import { defineLibraryConfig } from "@repo/vitest-config";

// No runtime code, so no coverage threshold: the assertions are all type-level.
export default defineLibraryConfig({
  name: "@repo/types",
  typeTests: true,
});
