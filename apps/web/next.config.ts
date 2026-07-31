import type { NextConfig } from "next";

/**
 * Minimal Next 16 app for the design-system gallery (Phase 7).
 *
 * Product routing, proxy.ts, auth, and tRPC mount in Phase 8.
 * `cacheComponents` is on so caching stays explicit when routes grow.
 */
const nextConfig: NextConfig = {
  cacheComponents: true,
  transpilePackages: ["@repo/ui"],
  // TypeScript 7 has no JS compiler API yet; next build must use local `tsc`.
  experimental: {
    useTypeScriptCli: true,
  },
};

export default nextConfig;
