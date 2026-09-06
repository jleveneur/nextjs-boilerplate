import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

import type { Locale } from "@repo/i18n";

import { routing } from "./routing.ts";

/**
 * Narrows the `[locale]` route segment to a supported locale.
 *
 * A route param is a raw string taken from the URL. Before the `AppConfig`
 * augmentation, next-intl accepted that string anywhere a locale was expected,
 * so `/xx/billing` reached `getTranslations({ locale: "xx" })` and rendered
 * fallback copy instead of 404ing. The proxy and this app's static params both
 * constrain the segment in practice, but neither is a type, and neither runs for
 * `generateMetadata`.
 *
 * Calling `notFound()` rather than falling back to the default locale is the
 * deliberate part: an unsupported locale in the path is a wrong URL, and silently
 * serving English at it creates a second address for every page.
 */
export function requireLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) {
    notFound();
  }

  return value;
}
