import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@repo/api",
    include: ["src/**/*.test.ts"],
    // Integration tests need a database and run under their own config.
    exclude: ["src/**/*.integration.test.ts"],
  },
});
