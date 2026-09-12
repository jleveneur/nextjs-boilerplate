import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    name: "@repo/api:integration",
    include: ["src/**/*.integration.test.ts"],
    // One database, shared. Parallel files would truncate each other's rows.
    fileParallelism: false,
    // Sign-up hashes a password, which is deliberately slow.
    testTimeout: 30_000,
  },
})
