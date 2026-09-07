import { defineConfig } from "tsdown";

/**
 * Bundle the one-shot migrate CLI into an ESM artifact for the migrate image.
 * Workspace packages and npm deps are inlined so the image needs no workspace
 * node_modules — only `dist/migrate.mjs` plus the SQL in a sibling
 * `migrations/`, which `src/migrate.ts` resolves via `import.meta.url`.
 *
 * `server-only` is stubbed (Node process, not an RSC boundary). Alias targets
 * must be absolute: relative paths resolve from the importer, which fails
 * inside the Docker prune build.
 */
export default defineConfig({
  entry: ["src/migrate.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  dts: false,
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
