import { defineConfig } from "tsdown";

/**
 * Bundle the API into a single ESM artifact for the Docker runner stage.
 * Workspace packages and npm deps are inlined so the image needs no
 * workspace node_modules — only `node dist/index.mjs`.
 * `server-only` is stubbed (Node process, not an RSC boundary).
 * Treeshake is off: bundling better-auth's organization plugin with treeshake
 * produced `Export 'getOrgAdapter' is not defined in module` at runtime.
 * `sharp` is stubbed — the API graph can pull it transitively but never calls it.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  dts: false,
  // Source maps for production images land in Phase 14 (Sentry releases).
  sourcemap: false,
  treeshake: false,
  alias: {
    "server-only": "./server-only-stub.ts",
    sharp: "./sharp-stub.ts",
  },
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
});
