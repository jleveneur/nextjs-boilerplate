import { hasLocale, type Messages } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as localeRootParam } from "next/root-params";

import { routing } from "./routing.ts";

/**
 * Message catalog for `locale`.
 *
 * The return type is `Messages`, which the `AppConfig` augmentation resolves to
 * the shape of `en.json`. That is what makes a missing key in a translated
 * catalog a compile error here rather than a silent fallback in production: the
 * import below has to be assignable to the English shape.
 *
 * A `switch` rather than a computed `import(`./messages/${locale}.json`)` so the
 * bundler can see every catalog statically and TypeScript can check each one.
 */
async function loadMessages(locale: string): Promise<Messages> {
  switch (locale) {
    case "fr":
      return (await import("@/messages/fr.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export default getRequestConfig(async ({ locale: localeOverride }) => {
  const resolved = localeOverride ?? (await localeRootParam());
  if (!hasLocale(routing.locales, resolved)) {
    notFound();
  }

  return {
    locale: resolved,
    messages: await loadMessages(resolved),
  };
});
