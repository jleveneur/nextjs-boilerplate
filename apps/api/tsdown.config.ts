import { defineConfig } from "tsdown";

/**
 * Bundle the API (and the one-shot migrate CLI) into ESM artifacts for the
 * Docker runner stage. Workspace packages and npm deps are inlined so the
 * image needs no workspace node_modules — only `dist/*.mjs` (+ SQL for migrate).
 * `server-only` is stubbed (Node process, not an RSC boundary).
 * Treeshake is off: bundling better-auth's organization plugin with treeshake
 * produced `Export 'getOrgAdapter' is not defined in module` at runtime.
 *
 * Alias targets must be absolute: relative paths are resolved from the importer
 * (workspace packages), which fails inside the Docker prune build.
 */
export default defineConfig({
  entry: ["src/index.ts", "src/migrate.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  dts: false,
  // Hidden source maps for Sentry upload — not served publicly.
  sourcemap: "hidden",
  treeshake: false,
  alias: {
    "server-only": `${import.meta.dirname}/server-only-stub.ts`,
  },
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
});
