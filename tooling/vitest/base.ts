/**
 * Shared Vitest configuration.
 *
 * Defined once so that "how tests run" is not a per-package decision that drifts.
 * A package's own `vitest.config.ts` should say what is different about it —
 * usually nothing beyond its name and coverage threshold.
 *
 * Coverage thresholds are deliberately per package rather than repo-wide: a
 * single number averages away the information you need, letting a security-
 * critical module rot while a large well-tested one carries the average. The
 * documented targets live in docs/architecture/10-testing.md.
 */

import { defineConfig, type ViteUserConfig } from "vitest/config";

type CoverageThresholds = {
  lines: number;
  functions?: number;
  branches?: number;
  statements?: number;
};

export type LibraryConfigOptions = {
  /** Shown in test output and reports. Use the package name. */
  name: string;
  /**
   * Line coverage floor. Omit only for packages whose behaviour is covered
   * elsewhere (apps are covered by E2E). Uncovered branches are reviewed for
   * why, never chased for the number.
   */
  coverage?: CoverageThresholds;
  /** Run before each test file — polyfills, matchers, deterministic clocks. */
  setupFiles?: string[];
  /**
   * "node" for libraries and server code, "jsdom" for anything touching the DOM.
   * Defaults to "node" because a DOM in a Node-only package hides an accidental
   * browser dependency.
   */
  environment?: "node" | "jsdom";
  /**
   * Run `*.test-d.ts` type assertions. Enable for packages whose behaviour *is*
   * its types — a branded ID that accepts a plain string is a broken branded ID,
   * and no runtime test can catch it.
   */
  typeTests?: boolean;
};

export function defineLibraryConfig(options: LibraryConfigOptions): ViteUserConfig {
  const { name, coverage, setupFiles, environment = "node", typeTests = false } = options;

  return defineConfig({
    test: {
      name,
      environment,
      ...(setupFiles === undefined ? {} : { setupFiles }),

      // Tests live beside the code they cover, so a module and its test move
      // together and an untested module is visible in the file listing.
      include: ["src/**/*.test.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],

      // No implicit globals. `describe` and `expect` are imported like anything
      // else, so a test file's dependencies are visible and the same lint rules
      // apply to it as to production code.
      globals: false,

      // A test that passes only because a previous test left state behind is
      // worse than a failing one: it passes in CI and fails when someone
      // reorders or filters the suite.
      clearMocks: true,
      mockReset: true,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,

      // Fail rather than hang. A test that waits forever burns a CI runner and
      // reports nothing useful.
      testTimeout: 10_000,
      hookTimeout: 10_000,

      // An `only` left in a file silently reduces the suite to one test while
      // still reporting green, so in CI it is an error.
      allowOnly: process.env["CI"] === undefined,

      // Surface slow tests instead of letting the suite quietly get slower.
      slowTestThreshold: 300,

      // A package with no tests at all is a mistake, not a pass — except where
      // the only tests are type assertions, which are collected separately.
      passWithNoTests: typeTests,

      ...(typeTests
        ? {
            typecheck: {
              enabled: true,
              include: ["src/**/*.test-d.ts"],
              tsconfig: "./tsconfig.json",
            },
          }
        : {}),

      coverage: {
        // V8's native coverage, rather than Istanbul's instrumentation: no
        // source transform, so what is measured is what actually ran.
        provider: "v8",
        // On whenever a threshold is set. A threshold that only applies under a
        // separate `--coverage` command is a threshold nobody finds out they broke
        // until someone thinks to run it.
        enabled: coverage !== undefined,
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "src/**/*.test.{ts,tsx}",
          // Type assertions have no runtime body; counting them as uncovered
          // would make a 100 % threshold impossible for any package that has them.
          "src/**/*.test-d.ts",
          "src/**/*.d.ts",
          // Barrel files only re-export; covering them measures nothing.
          "src/index.ts",
          "src/**/__fixtures__/**",
        ],
        // Everything matching `include` is reported whether a test imported it
        // or not, so deleting a test lowers coverage instead of raising it.
        // Vitest 4 does this by default; Vitest 1-3 needed `all: true`, which no
        // longer exists.
        reporter: ["text", "html", "lcov"],
        ...(coverage === undefined ? {} : { thresholds: coverage }),
      },
    },
  });
}
