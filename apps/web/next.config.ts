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

/**
 * Response headers applied to every route.
 *
 * The `Content-Security-Policy` here is deliberately partial. `frame-ancestors`,
 * `base-uri`, and `object-src` are the directives that need no knowledge of the
 * page, so they can ship in a starter. A `script-src` worth having requires a
 * per-request nonce threaded through the app, and one written without that
 * either breaks Next's inline bootstrap or is loose enough to be decorative.
 */
const SECURITY_HEADERS = [
  // Browsers ignore this over plain HTTP, so it costs nothing locally.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  {
    key: "Content-Security-Policy",
    value: ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"].join("; "),
  },
];

const nextConfig: NextConfig = {
  headers() {
    return Promise.resolve([{ source: "/:path*", headers: SECURITY_HEADERS }]);
  },

  // Internal packages ship TypeScript source with no build step, so Next has to
  // compile them the same way it compiles `src/`.
  transpilePackages: ["@repo/api", "@repo/auth", "@repo/authz", "@repo/db", "@repo/ui"],
  experimental: {
    // TypeScript 7 has no JavaScript compiler API yet, so `next build` shells
    // out to the local `tsc` instead of loading it in-process.
    useTypeScriptCli: true,
  },
};

export default nextConfig;
