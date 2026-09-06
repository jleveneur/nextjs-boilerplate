import type { MetadataRoute } from "next";

import { defaultLocale } from "@repo/i18n";

import { languageAlternates, localizedUrl, PUBLIC_PATHS } from "@/lib/seo.ts";

/**
 * Public routes, one entry per path with every locale as an alternate.
 *
 * Only pages a signed-out visitor can actually reach belong here. Everything
 * under `/[locale]/[orgSlug]` redirects to sign-in, so listing it would
 * advertise URLs that answer 307 to a crawler — and the org slugs are tenant
 * data, which has no business in a public file.
 *
 * The token-carrying auth flows are excluded for the same reason `robots.ts`
 * disallows them: a crawler fetching one consumes a single-use token.
 *
 * ## Why `alternates.languages`
 *
 * `localePrefix: "always"` means `/en/sign-in` and `/fr/sign-in` are two URLs
 * with the same content. Without hreflang a search engine treats that as
 * duplication and picks one, which is how the French page stops being served to
 * French searchers. The alternates map says they are translations of each other.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    // The default locale is the listed entry; the others are its alternates.
    url: localizedUrl(defaultLocale, path),
    lastModified,
    changeFrequency: "weekly" as const,
    // The marketing root is the page worth ranking; the auth pages are utilities.
    priority: path === "" ? 1 : 0.5,
    alternates: { languages: languageAlternates(path) },
  }));
}
