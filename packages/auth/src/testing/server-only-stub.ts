/**
 * Vitest alias target for the `server-only` package.
 *
 * Real `server-only` throws outside the React Server Components graph; integration
 * tests import package barrels that depend on that side effect.
 */
export const serverOnlyStub = true;
