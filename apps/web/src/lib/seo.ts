import type { Metadata } from "next";

import { defaultLocale, locales, type Locale } from "@repo/i18n";

import { publicUrl } from "./public-url.ts";

/**
 * Public, indexable routes, as paths under the locale prefix.
 *
 * One list, consumed by `sitemap.ts` and by {@link localizedMetadata}, so a page
 * cannot be advertised in the sitemap while declaring a canonical that points
 * somewhere else. Everything else in the app either requires a session or
 * carries a single-use token, and belongs in neither.
 */
export const PUBLIC_PATHS = ["", "/sign-in", "/sign-up"] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];

/** Absolute URL of `path` in `locale`. */
export function localizedUrl(locale: Locale, path: PublicPath): string {
  return `${publicUrl()}/${locale}${path}`;
}

/** Every locale's URL for `path`, keyed for an `hreflang` map. */
export function languageAlternates(path: PublicPath): Record<string, string> {
  return Object.fromEntries(locales.map((locale) => [locale, localizedUrl(locale, path)]));
}

/**
 * Canonical, `hreflang` alternates and `og:url` for one public page.
 *
 * These **must** be set per page rather than inherited from the locale layout.
 * Next merges `alternates` down the tree, so a canonical declared once in the
 * layout applies unchanged to every child: `/fr/sign-in` would tell a crawler
 * its canonical is `/fr`, which asserts that sign-in *is* the home page. That is
 * worse than declaring nothing, because it actively removes the page from the
 * index rather than merely failing to help it.
 *
 * ```ts
 * export const metadata = localizedMetadata("en", "/sign-in");
 * ```
 */
export function localizedMetadata(locale: Locale, path: PublicPath): Metadata {
  return {
    alternates: {
      canonical: localizedUrl(locale, path),
      languages: {
        ...languageAlternates(path),
        // The default locale doubles as the unprefixed fallback for a crawler
        // that has no locale preference to express.
        "x-default": localizedUrl(defaultLocale, path),
      },
    },
    openGraph: {
      url: localizedUrl(locale, path),
      locale,
    },
  };
}
