import { defineConfig } from "vitest/config"

/**
 * Pure logic only — `.ts`, never `.tsx`.
 *
 * Anything that renders is covered by the Playwright suite in `e2e/`, against
 * a real server. This is for the framework-free functions those journeys route
 * through, where a browser round trip is a slow way to assert a pure function
 * and an end-to-end test only ever exercises the happy path.
 */
export default defineConfig({
  test: {
    name: "@repo/web",
    include: ["src/**/*.test.ts"],
  },
})
