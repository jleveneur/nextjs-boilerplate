import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@repo/api",
    include: ["src/**/*.test.ts"],
  },
});
