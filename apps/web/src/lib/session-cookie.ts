/**
 * Better Auth session cookie names (product defaults).
 *
 * Used only for presence checks in `proxy.ts` — never for authentication.
 * Secure-cookie mode prefixes the name with `__Secure-` when the auth
 * base URL is HTTPS (`useSecureCookies` in `@repo/auth`).
 */
export const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;
