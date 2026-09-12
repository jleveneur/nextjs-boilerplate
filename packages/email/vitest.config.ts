import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "@repo/email",
    include: ["src/**/*.test.ts"],
  },
})
