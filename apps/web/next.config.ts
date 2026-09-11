import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// The workspace keeps one `.env` at the repository root, and Next only looks
// inside the app directory. Node reads the file natively; in CI and production
// the variables are already set, so it is absent and this is a no-op.
const rootEnv = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const nextConfig: NextConfig = {
  // Internal packages ship TypeScript source with no build step, so Next has to
  // compile them the same way it compiles `src/`.
  transpilePackages: ["@repo/api", "@repo/auth", "@repo/db", "@repo/ui"],
  experimental: {
    // TypeScript 7 has no JavaScript compiler API yet, so `next build` shells
    // out to the local `tsc` instead of loading it in-process.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
