import type { MiddlewareHandler } from "hono";

/**
 * Baseline security headers for every API response.
 *
 * CSP and HSTS belong at the TLS-terminating reverse proxy for adopters
 * (see docs/security/phase-16-review.md). Web HTML gets a parallel set in
 * `apps/web/src/proxy.ts`.
 */
export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
};
