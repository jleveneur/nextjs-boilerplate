import { defineConfig } from "tsdown";

/**
 * Bundle the worker into a single ESM artifact. `sharp` stays external so the
 * Alpine image can ship its platform-native libvips binary from node_modules.
 * `server-only` is stubbed — workspace packages import it as a Next firewall;
 * the worker is a Node process, not an RSC boundary.
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
  alias: {
    "server-only": "./server-only-stub.ts",
  },
  deps: {
    alwaysBundle: (id) => id !== "sharp" && !id.startsWith("sharp/"),
    neverBundle: ["sharp"],
    onlyBundle: false,
  },
});
