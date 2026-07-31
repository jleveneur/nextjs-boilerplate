import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Product Next 16 app.
 *
 * `cacheComponents` is on so caching stays explicit when routes grow.
 * TypeScript 7 has no JS compiler API yet; next build must use local `tsc`.
 */
const nextConfig: NextConfig = {
  // Standalone output is what the web Docker image copies — a minimal Node
  // server plus traced deps, not the full monorepo node_modules.
  output: "standalone",
  cacheComponents: true,
  transpilePackages: ["@repo/ui", "@repo/i18n", "@repo/env"],
  experimental: {
    useTypeScriptCli: true,
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
