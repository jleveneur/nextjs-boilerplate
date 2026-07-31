import { defineConfig } from "tsdown";

/**
 * Bundle the API into a single ESM artifact for the Docker runner stage.
 * Workspace packages and npm deps are inlined so the image needs no
 * workspace node_modules — only `node dist/index.mjs`.
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
  deps: {
    // package.json dependencies are external by default; force them in.
    alwaysBundle: [/.*/],
    onlyBundle: false,
  },
});
