/**
 * Baseline security response headers.
 *
 * One source, applied twice on purpose:
 *
 * - `next.config.ts` `headers()` covers every route, including `/api/*`, which
 *   `proxy.ts` cannot reach — its matcher excludes `api` so that oRPC and
 *   Better Auth handlers are not locale-rewritten.
 * - `proxy.ts` applies them to responses it produces itself (the sign-in
 *   redirect and the locale rewrite), which do not pass through `headers()`.
 *
 * Kept as data rather than a function so both a Next config object and a
 * `NextResponse` can consume it.
 */
export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
