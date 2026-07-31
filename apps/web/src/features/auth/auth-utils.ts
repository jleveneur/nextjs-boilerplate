/** Returns a same-origin relative path suitable for post-auth redirects. */
export function getSafeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (next === undefined || next === null || next.length === 0) {
    return fallback;
  }
  if (!next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  return next;
}

/**
 * Path for next-intl `router.push` / `Link` (no locale prefix).
 * Accepts either a locale-prefixed `next` (from proxy) or an app-relative path.
 */
export function getPostAuthHref(next: string | null | undefined, locale: string): string {
  const localePrefix = `/${locale}`;
  const safe = getSafeNextPath(next, localePrefix);
  if (safe === localePrefix || safe === `${localePrefix}/`) {
    return "/";
  }
  if (safe.startsWith(`${localePrefix}/`)) {
    return safe.slice(localePrefix.length);
  }
  return safe;
}

/** Absolute-on-origin path including locale — for Better Auth callbackURL / window redirects. */
export function getPostAuthCallbackURL(next: string | null | undefined, locale: string): string {
  const href = getPostAuthHref(next, locale);
  if (href === "/") {
    return `/${locale}`;
  }
  return `/${locale}${href}`;
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.length > 0
  ) {
    return error.message;
  }
  return fallback;
}
