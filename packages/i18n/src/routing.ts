/**
 * Locale routing configuration.
 *
 * Shaped to match what `next-intl` expects for `defineRouting`, so `apps/web`
 * can spread this object rather than re-declaring the locale list. This package
 * deliberately does not depend on next-intl: email and workers need the locale
 * list without pulling in a Next.js peer.
 */

import { defaultLocale, locales } from "./locales.ts";

/**
 * How the locale appears in the URL.
 *
 * - `always` — every path is prefixed (`/en/…`, `/fr/…`). Unambiguous and
 *   cache-friendly; the choice for a product that is localised from day one.
 * - `as-needed` — default locale has no prefix. Slightly prettier URLs, more
 *   edge cases around canonicalisation and middleware.
 */
export type LocalePrefix = "always" | "as-needed" | "never";

export const routing = {
  locales,
  defaultLocale,
  localePrefix: "always" as const satisfies LocalePrefix,
} as const;

export type RoutingConfig = typeof routing;
