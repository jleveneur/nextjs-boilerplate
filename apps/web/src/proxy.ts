import { isLocale } from "@repo/i18n";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing.ts";
import { SESSION_COOKIE_NAME } from "./lib/session-cookie.ts";

const handleI18nRouting = createMiddleware(routing);

/** First path segments after the locale that do not require a session cookie. */
const PUBLIC_SEGMENTS = new Set([
  "",
  "design-system",
  "sign-in",
  "sign-up",
  "verify-email",
  "forgot-password",
  "reset-password",
  "magic-link",
  "two-factor",
  "accept-invitation",
  "passkey",
]);

function localeAndRest(pathname: string): { locale: string; rest: string[] } | undefined {
  const parts = pathname.split("/").filter(Boolean);
  const locale = parts[0];
  if (locale === undefined || !isLocale(locale)) {
    return undefined;
  }
  return { locale, rest: parts.slice(1) };
}

function requiresSessionCookie(pathname: string): boolean {
  const parsed = localeAndRest(pathname);
  if (parsed === undefined) return false;
  const first = parsed.rest[0] ?? "";
  return !PUBLIC_SEGMENTS.has(first);
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

/**
 * Locale negotiation + cookie *presence* gates for product routes.
 *
 * Does not authenticate or authorize — session verification happens in
 * request context builders (`resolveActor`).
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (requiresSessionCookie(pathname)) {
    const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
    if (!hasSession) {
      const parsed = localeAndRest(pathname);
      const locale = parsed?.locale ?? routing.defaultLocale;
      const signIn = new URL(`/${locale}/sign-in`, request.url);
      signIn.searchParams.set("next", pathname);
      return withSecurityHeaders(NextResponse.redirect(signIn));
    }
  }

  return withSecurityHeaders(handleI18nRouting(request));
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
