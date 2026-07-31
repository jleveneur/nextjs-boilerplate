import { defineConfig } from "tsdown";

/**
 * Bundle the worker into a single ESM artifact. `sharp` stays external so the
 * Alpine image can ship its platform-native libvips binary from node_modules.
 */
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  dts: false,
  sourcemap: false,
  deps: {
    alwaysBundle: (id) => id !== "sharp" && !id.startsWith("sharp/"),
    neverBundle: ["sharp"],
    onlyBundle: false,
  },
});
