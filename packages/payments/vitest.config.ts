import { defineLibraryConfig } from "@repo/vitest-config";
import { defineConfig, mergeConfig } from "vitest/config";

const base = defineLibraryConfig({
  name: "@repo/payments",
  coverage: { lines: 60, functions: 60, branches: 50, statements: 60 },
});

export default mergeConfig(
  base,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "src/index.ts",
          // Live Stripe SDK adapter — exercised via constructEvent unit tests;
          // network methods need recorded fixtures / integration.
          "src/stripe-gateway.ts",
          "src/testing/**",
          "src/**/*.test.ts",
          "src/**/*.test.tsx",
          "src/**/*.d.ts",
        ],
      },
    },
  }),
);
