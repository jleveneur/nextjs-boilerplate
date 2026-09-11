import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@repo/ui",
    include: ["src/**/*.test.ts"],
  },
});
